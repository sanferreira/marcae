export default function Logo({ className = "" }: { className?: string }) {
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

  return (
    <div className={`flex items-center ${className}`}>
      <img
        src={logoSrc}
        alt="Marcae"
        className="h-12 w-[190px] md:h-14 md:w-[230px] object-contain object-left"
        loading="eager"
      />
    </div>
  );
}
