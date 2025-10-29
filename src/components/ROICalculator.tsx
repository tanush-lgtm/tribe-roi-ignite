import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ScenarioResult {
  targetVisibility: number;
  visitorsPerDay: number;
  extraVisitorsPerMonth: number;
  extraOrdersPerMonth: number;
  extraRevenuePerMonth: number;
}

interface MonthData {
  month: number;
  visibility: number;
  visitorsPerDay: number;
  extraVisitorsPerMonth: number;
  ordersPerMonth: number;
  extraOrders: number;
  extraRevenue: number;
}

interface RampResult {
  months: MonthData[];
  totalExtraRevenue: number;
  paybackDays: number;
}

const ROICalculator = () => {
  const [aov, setAov] = useState(28);
  const [cr, setCr] = useState(1.5);
  const [dailyOrders, setDailyOrders] = useState(27);
  const [currentVisibility, setCurrentVisibility] = useState(33);
  const [showQuote, setShowQuote] = useState(false);

  const PROGRAM_COST = 5550; // $1,850 × 3
  const RAMP_MONTHS = 3;

  // Calculate derived values
  const visitorsToday = useMemo(() => dailyOrders / (cr / 100), [dailyOrders, cr]);
  const ordersToday = useMemo(() => dailyOrders * 30, [dailyOrders]);

  // Anchored linear visitors model
  const calculateVisitors = useMemo(() => {
    return (visibility: number) => {
      const vRaw = -850 + 63.333 * visibility;
      const vRawCurrent = -850 + 63.333 * currentVisibility;
      const scale = visitorsToday / vRawCurrent;
      return scale * vRaw;
    };
  }, [visitorsToday, currentVisibility]);

  const calculateScenario = useMemo(() => {
    return (targetVisibility: number): ScenarioResult => {
      const visitorsPerDay = calculateVisitors(targetVisibility);
      const extraVisitorsPerMonth = (visitorsPerDay - visitorsToday) * 30;
      const ordersPerMonth = visitorsPerDay * 30 * (cr / 100);
      const extraOrdersPerMonth = ordersPerMonth - ordersToday;
      const extraRevenuePerMonth = extraOrdersPerMonth * aov;

      return {
        targetVisibility,
        visitorsPerDay,
        extraVisitorsPerMonth,
        extraOrdersPerMonth,
        extraRevenuePerMonth,
      };
    };
  }, [calculateVisitors, visitorsToday, cr, ordersToday, aov]);

  const calculateRamp = useMemo(() => {
    return (targetVisibility: number): RampResult => {
    const months: MonthData[] = [];
    let cumulativeRevenue = 0;

    for (let m = 1; m <= RAMP_MONTHS; m++) {
      const visibility = currentVisibility + (m * (targetVisibility - currentVisibility)) / RAMP_MONTHS;
      const visitorsPerDay = calculateVisitors(visibility);
      const extraVisitorsPerMonth = (visitorsPerDay - visitorsToday) * 30;
      const ordersPerMonth = visitorsPerDay * 30 * (cr / 100);
      const extraOrders = ordersPerMonth - ordersToday;
      const extraRevenue = extraOrders * aov;

      cumulativeRevenue += extraRevenue;

      months.push({
        month: m,
        visibility,
        visitorsPerDay,
        extraVisitorsPerMonth,
        ordersPerMonth,
        extraOrders,
        extraRevenue,
      });
    }

    // Calculate payback days
    let paybackDays = 0;
    if (months[0].extraRevenue >= PROGRAM_COST) {
      paybackDays = 30 * (PROGRAM_COST / months[0].extraRevenue);
    } else {
      let cumulative = 0;
      for (let i = 0; i < months.length; i++) {
        if (cumulative + months[i].extraRevenue >= PROGRAM_COST) {
          const remaining = PROGRAM_COST - cumulative;
          paybackDays = 30 * i + 30 * (remaining / months[i].extraRevenue);
          break;
        }
        cumulative += months[i].extraRevenue;
      }
    }

      return {
        months,
        totalExtraRevenue: cumulativeRevenue,
        paybackDays,
      };
    };
  }, [calculateVisitors, visitorsToday, cr, ordersToday, aov, PROGRAM_COST, RAMP_MONTHS]);

  const conservative = useMemo(() => calculateScenario(50), [calculateScenario]);
  const baseline = useMemo(() => calculateScenario(65), [calculateScenario]);
  const aggressive = useMemo(() => calculateScenario(75), [calculateScenario]);

  const conservativeRamp = useMemo(() => calculateRamp(50), [calculateRamp]);
  const baselineRamp = useMemo(() => calculateRamp(65), [calculateRamp]);
  const aggressiveRamp = useMemo(() => calculateRamp(75), [calculateRamp]);

  const formatNumber = (num: number) => Math.round(num).toLocaleString();
  const formatCurrency = (num: number) => `$${Math.round(num).toLocaleString()}`;
  const formatPercent = (num: number) => `${num.toFixed(1)}%`;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Tampon Tribe
          </h1>
          <p className="text-xl text-muted-foreground">AI Search Visibility ROI</p>
        </div>

        {/* How it works */}
        <Card className="mb-8 p-6">
          <h2 className="mb-3 text-2xl font-semibold">How it works</h2>
          <p className="text-muted-foreground">
            We turn visibility into visitors using your real data, then into orders using your CR,
            then into revenue using your AOV.
          </p>
        </Card>

        {/* Business Metrics */}
        <Card className="mb-8 p-6">
          <h2 className="mb-6 text-2xl font-semibold">Your business metrics</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="aov">Average Order Value (AOV)</Label>
              <div className="mt-2 flex items-center">
                <span className="mr-2 text-muted-foreground">$</span>
                <Input
                  id="aov"
                  type="number"
                  value={aov}
                  onChange={(e) => setAov(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cr">Conversion Rate (%)</Label>
              <Input
                id="cr"
                type="number"
                step="0.1"
                value={cr}
                onChange={(e) => setCr(Number(e.target.value))}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="dailyOrders">Daily Orders Today</Label>
              <Input
                id="dailyOrders"
                type="number"
                value={dailyOrders}
                onChange={(e) => setDailyOrders(Number(e.target.value))}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="currentVisibility">Current Visibility (%)</Label>
              <Input
                id="currentVisibility"
                type="number"
                value={currentVisibility}
                onChange={(e) => setCurrentVisibility(Number(e.target.value))}
                className="mt-2"
              />
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Visitors/day today</p>
              <p className="text-2xl font-bold text-foreground">{formatNumber(visitorsToday)}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Orders/month today</p>
              <p className="text-2xl font-bold text-foreground">{formatNumber(ordersToday)}</p>
            </div>
          </div>
        </Card>

        {/* Projected Lift */}
        <Card className="mb-8 p-6">
          <h2 className="mb-3 text-2xl font-semibold">
            Projected lift (per month at target after month 3)
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Numbers show the extra visitors, orders, and revenue per month once you reach the target
            visibility.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left text-sm font-semibold">Scenario</th>
                  <th className="pb-3 text-right text-sm font-semibold">Target visibility</th>
                  <th className="pb-3 text-right text-sm font-semibold">Visitors/day at target</th>
                  <th className="pb-3 text-right text-sm font-semibold">Extra visitors/month</th>
                  <th className="pb-3 text-right text-sm font-semibold">Extra orders/month</th>
                  <th className="pb-3 text-right text-sm font-semibold">Extra revenue/month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-3 font-medium">Conservative</td>
                  <td className="py-3 text-right">{formatPercent(conservative.targetVisibility)}</td>
                  <td className="py-3 text-right">{formatNumber(conservative.visitorsPerDay)}</td>
                  <td className="py-3 text-right">{formatNumber(conservative.extraVisitorsPerMonth)}</td>
                  <td className="py-3 text-right">{formatNumber(conservative.extraOrdersPerMonth)}</td>
                  <td className="py-3 text-right font-semibold text-primary">
                    {formatCurrency(conservative.extraRevenuePerMonth)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">Baseline</td>
                  <td className="py-3 text-right">{formatPercent(baseline.targetVisibility)}</td>
                  <td className="py-3 text-right">{formatNumber(baseline.visitorsPerDay)}</td>
                  <td className="py-3 text-right">{formatNumber(baseline.extraVisitorsPerMonth)}</td>
                  <td className="py-3 text-right">{formatNumber(baseline.extraOrdersPerMonth)}</td>
                  <td className="py-3 text-right font-semibold text-primary">
                    {formatCurrency(baseline.extraRevenuePerMonth)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">Aggressive</td>
                  <td className="py-3 text-right">{formatPercent(aggressive.targetVisibility)}</td>
                  <td className="py-3 text-right">{formatNumber(aggressive.visitorsPerDay)}</td>
                  <td className="py-3 text-right">{formatNumber(aggressive.extraVisitorsPerMonth)}</td>
                  <td className="py-3 text-right">{formatNumber(aggressive.extraOrdersPerMonth)}</td>
                  <td className="py-3 text-right font-semibold text-primary">
                    {formatCurrency(aggressive.extraRevenuePerMonth)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Small print: CR held at {cr}%. AOV {formatCurrency(aov)}. Current visibility{" "}
            {currentVisibility}%.
          </p>
        </Card>

        {/* Month-by-month ramp */}
        <div className="mb-8 space-y-6">
          <h2 className="text-2xl font-semibold">Month-by-month during the 3-month ramp</h2>
          <p className="text-sm text-muted-foreground">
            You earn a portion each month as visibility rises. Totals below are the sum earned
            during the ramp before steady state.
          </p>

          {/* Conservative Ramp */}
          <Card className="p-6">
            <h3 className="mb-4 text-xl font-semibold">Conservative to 50%</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-left text-sm font-semibold">Month</th>
                    <th className="pb-3 text-right text-sm font-semibold">Visibility %</th>
                    <th className="pb-3 text-right text-sm font-semibold">Visitors/day</th>
                    <th className="pb-3 text-right text-sm font-semibold">Extra visitors/month</th>
                    <th className="pb-3 text-right text-sm font-semibold">Orders/month</th>
                    <th className="pb-3 text-right text-sm font-semibold">+ Orders</th>
                    <th className="pb-3 text-right text-sm font-semibold">+ Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {conservativeRamp.months.map((m) => (
                    <tr key={m.month}>
                      <td className="py-3">{m.month}</td>
                      <td className="py-3 text-right">{formatPercent(m.visibility)}</td>
                      <td className="py-3 text-right">{formatNumber(m.visitorsPerDay)}</td>
                      <td className="py-3 text-right">{formatNumber(m.extraVisitorsPerMonth)}</td>
                      <td className="py-3 text-right">{formatNumber(m.ordersPerMonth)}</td>
                      <td className="py-3 text-right">{formatNumber(m.extraOrders)}</td>
                      <td className="py-3 text-right font-semibold text-primary">
                        {formatCurrency(m.extraRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm font-semibold">
              Total extra revenue in ramp: {formatCurrency(conservativeRamp.totalExtraRevenue)}
            </p>
          </Card>

          {/* Baseline Ramp */}
          <Card className="p-6">
            <h3 className="mb-4 text-xl font-semibold">Baseline to 65%</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-left text-sm font-semibold">Month</th>
                    <th className="pb-3 text-right text-sm font-semibold">Visibility %</th>
                    <th className="pb-3 text-right text-sm font-semibold">Visitors/day</th>
                    <th className="pb-3 text-right text-sm font-semibold">Extra visitors/month</th>
                    <th className="pb-3 text-right text-sm font-semibold">Orders/month</th>
                    <th className="pb-3 text-right text-sm font-semibold">+ Orders</th>
                    <th className="pb-3 text-right text-sm font-semibold">+ Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {baselineRamp.months.map((m) => (
                    <tr key={m.month}>
                      <td className="py-3">{m.month}</td>
                      <td className="py-3 text-right">{formatPercent(m.visibility)}</td>
                      <td className="py-3 text-right">{formatNumber(m.visitorsPerDay)}</td>
                      <td className="py-3 text-right">{formatNumber(m.extraVisitorsPerMonth)}</td>
                      <td className="py-3 text-right">{formatNumber(m.ordersPerMonth)}</td>
                      <td className="py-3 text-right">{formatNumber(m.extraOrders)}</td>
                      <td className="py-3 text-right font-semibold text-primary">
                        {formatCurrency(m.extraRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm font-semibold">
              Total extra revenue in ramp: {formatCurrency(baselineRamp.totalExtraRevenue)}
            </p>
          </Card>

          {/* Aggressive Ramp */}
          <Card className="p-6">
            <h3 className="mb-4 text-xl font-semibold">Aggressive to 75%</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-left text-sm font-semibold">Month</th>
                    <th className="pb-3 text-right text-sm font-semibold">Visibility %</th>
                    <th className="pb-3 text-right text-sm font-semibold">Visitors/day</th>
                    <th className="pb-3 text-right text-sm font-semibold">Extra visitors/month</th>
                    <th className="pb-3 text-right text-sm font-semibold">Orders/month</th>
                    <th className="pb-3 text-right text-sm font-semibold">+ Orders</th>
                    <th className="pb-3 text-right text-sm font-semibold">+ Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {aggressiveRamp.months.map((m) => (
                    <tr key={m.month}>
                      <td className="py-3">{m.month}</td>
                      <td className="py-3 text-right">{formatPercent(m.visibility)}</td>
                      <td className="py-3 text-right">{formatNumber(m.visitorsPerDay)}</td>
                      <td className="py-3 text-right">{formatNumber(m.extraVisitorsPerMonth)}</td>
                      <td className="py-3 text-right">{formatNumber(m.ordersPerMonth)}</td>
                      <td className="py-3 text-right">{formatNumber(m.extraOrders)}</td>
                      <td className="py-3 text-right font-semibold text-primary">
                        {formatCurrency(m.extraRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm font-semibold">
              Total extra revenue in ramp: {formatCurrency(aggressiveRamp.totalExtraRevenue)}
            </p>
          </Card>
        </div>

        {/* Payback periods */}
        <Card className="mb-8 p-6">
          <h2 className="mb-6 text-2xl font-semibold">Paid back in</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/50 p-6">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Conservative</p>
              <p className="text-3xl font-bold text-primary">
                {Math.round(conservativeRamp.paybackDays)} days
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-6">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Baseline</p>
              <p className="text-3xl font-bold text-primary">
                {Math.round(baselineRamp.paybackDays)} days
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-6">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Aggressive</p>
              <p className="text-3xl font-bold text-primary">
                {Math.round(aggressiveRamp.paybackDays)} days
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Net during the 3-month ramp after costs: Conservative{" "}
            {formatCurrency(conservativeRamp.totalExtraRevenue - PROGRAM_COST)}, Baseline{" "}
            {formatCurrency(baselineRamp.totalExtraRevenue - PROGRAM_COST)}, Aggressive{" "}
            {formatCurrency(aggressiveRamp.totalExtraRevenue - PROGRAM_COST)}.
          </p>
        </Card>

        {/* Get Quote Section */}
        <Card className="border-2 border-primary bg-gradient-to-br from-background to-muted/30 p-8">
          <div className="text-center">
            <h2 className="mb-4 text-3xl font-bold">Get Quote</h2>
            
            {!showQuote ? (
              <>
                <p className="mb-6 text-lg text-muted-foreground">
                  We aim for the Aggressive target. We offer one plan and one quote.
                </p>
                <Button size="lg" className="text-lg font-semibold" onClick={() => setShowQuote(true)}>
                  Get Quote
                </Button>
              </>
            ) : (
              <>
                <p className="mb-6 text-lg text-muted-foreground">
                  We aim for the Aggressive target. We offer one plan and one quote.
                </p>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Best results with the 3-month plan.
                </p>

                <div className="mb-8 inline-block rounded-lg bg-primary/10 px-6 py-4">
                  <p className="mb-1 text-sm font-medium text-muted-foreground">Price</p>
                  <p className="text-4xl font-bold text-primary">$1,850</p>
                  <p className="text-lg text-muted-foreground">per month for 3 months</p>
                </div>

                <div className="mb-8 text-left">
                  <h3 className="mb-4 text-xl font-semibold">What we do for you</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start">
                      <span className="mr-2 text-primary">•</span>
                      <span>Handle <strong>300 to 500</strong> quality engagements on Reddit and Quora each month.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-primary">•</span>
                      <span>Create <strong>20</strong> blog articles each month.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-primary">•</span>
                      <span>Create <strong>5</strong> website category pages each month.</span>
                    </li>
                  </ul>
                  <p className="mt-4 text-sm italic text-muted-foreground">
                    This scope is designed to reach the Aggressive outcome when executed well.
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ROICalculator;
