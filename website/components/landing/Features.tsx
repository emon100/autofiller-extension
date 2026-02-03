import {
  Zap,
  Shield,
  Globe,
  RefreshCw,
  Eye,
  Lock,
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description:
      'Fill entire application forms in 2-3 seconds. No more repetitive typing.',
  },
  {
    icon: Globe,
    title: 'Works Everywhere',
    description:
      'Greenhouse, Lever, Workday, Ashby, and hundreds more ATS platforms supported.',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description:
      'Your data stays on your device. We never store or transmit your personal information.',
  },
  {
    icon: RefreshCw,
    title: 'Learns Once',
    description:
      'Fill out forms manually once, and AutoFiller learns your answers for future applications.',
  },
  {
    icon: Eye,
    title: 'Full Transparency',
    description:
      'See exactly what was filled, with undo buttons and clear visual feedback.',
  },
  {
    icon: Lock,
    title: 'Sensitive Field Protection',
    description:
      'Salary, demographics, and other sensitive fields require explicit confirmation.',
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything You Need to Apply Faster
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Built by job seekers, for job seekers. Every feature is designed to
            save you time while keeping you in control.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-200 p-6 transition hover:border-blue-200 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-lg bg-blue-100 p-3">
                <feature.icon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
