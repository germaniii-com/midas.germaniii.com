import {
  CalculatorIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import InterestCalculator from './components/InterestCalculator';
import InvestmentProjection from './components/InvestmentProjection';
import LoanCalculator from './components/LoanCalculator';
import SavingsGoalPlanner from './components/SavingsGoalPlanner';

const tools = [
  {
    title: 'Interest Calculator',
    description: 'Calculate simple or compound interest growth over time',
    icon: CalculatorIcon,
    component: InterestCalculator,
  },
  {
    title: 'Investment Projections',
    description: 'Project portfolio growth with recurring contributions',
    icon: ArrowTrendingUpIcon,
    component: InvestmentProjection,
  },
  {
    title: 'Loan Calculator',
    description: 'Estimate monthly payments and total interest for a loan',
    icon: BanknotesIcon,
    component: LoanCalculator,
  },
  {
    title: 'Savings Goal Planner',
    description: 'Plan how long it takes to reach a savings target',
    icon: FlagIcon,
    component: SavingsGoalPlanner,
  },
];

export default function ToolsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tools</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const Component = tool.component;
          return (
            <div
              key={tool.title}
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--color-surface-secondary)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon width={20} className="text-app-muted" />
                <h2 className="text-lg font-semibold">{tool.title}</h2>
              </div>
              <p className="text-xs text-app-muted mb-4">{tool.description}</p>
              <Component />
            </div>
          );
        })}
      </div>
    </div>
  );
}
