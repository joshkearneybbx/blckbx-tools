interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="min-h-screen bg-[#E8E4DE] px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <section className="border border-[#D4D0CB] bg-[#FAFAF8] p-8 md:p-12">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#6F6A63]">
            Coming Soon
          </p>
          <h1 className="font-serif text-4xl font-semibold text-[#1A1A1A] md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#4C4843]">
            {description ?? "This workspace is being prepared for the next phase of BlckBx tools."}
          </p>
        </section>
      </div>
    </div>
  );
}
