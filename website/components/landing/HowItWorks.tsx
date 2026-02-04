const steps = [
  {
    number: '01',
    title: 'Install the Extension',
    description:
      'Download OneFillr from the Download page and add to Chrome. Takes under 2 minutes.',
  },
  {
    number: '02',
    title: 'Fill Out a Form Manually',
    description:
      'Apply to one job as usual. OneFillr watches and learns your answers.',
  },
  {
    number: '03',
    title: 'Auto-Fill Future Applications',
    description:
      'Click the OneFillr button on any job application. Done in seconds.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Get started in under a minute. No configuration required.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-4xl">
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-1/2 top-12 hidden h-0.5 w-full bg-blue-200 md:block" />
                )}

                <div className="relative flex flex-col items-center text-center">
                  <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                    {step.number}
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
