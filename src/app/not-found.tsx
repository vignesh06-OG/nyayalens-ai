import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="relative mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <div aria-hidden="true" className="mesh-blob mesh-a right-[15%] top-[15%] h-64 w-64" />
      <p className="relative z-10 text-7xl font-semibold tracking-tight text-prism">404</p>
      <h1 className="relative z-10 text-2xl font-semibold tracking-tight text-frost md:text-3xl">
        This clause doesn&apos;t exist
      </h1>
      <p className="relative z-10 max-w-md text-sm leading-relaxed text-slate-400">
        The page you requested isn&apos;t part of this matter — yet. Head back to the lens and
        keep reading.
      </p>
      <div className="relative z-10">
        <Button href="/">Return to NyayaLens</Button>
      </div>
    </section>
  );
}
