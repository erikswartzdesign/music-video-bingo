import Image from "next/image";

export default function HomePage() {
  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Image
            src="/Elation-Ent-V1.png"
            alt="Elation Entertainment"
            width={520}
            height={160}
            className="h-auto w-80 sm:w-96"
            priority
          />
        </div>

        <h1 className="text-4xl font-bold mb-3">Music Video Bingo</h1>

        <p className="text-slate-200 text-lg">
          Scan the venue QR code to join tonight’s game.
        </p>

        <p className="mt-2 text-slate-400 text-sm">
          If you’re already at a venue, ask your host where the QR code is posted.
        </p>
      </div>
    </main>
  );
}
