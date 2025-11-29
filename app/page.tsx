"use client";

import Link from "next/link";

import Image from "next/image";


export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <header className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4">
          <Image
            src="/mvb-logo.png"                // file in /public
            alt="Music Video Bingo logo"
            width={320}
            height={80}
            className="mx-auto h-auto w-88 sm:w-128"
            priority
          />
        </div>
        <h1 className="text-3xl font-bold mb-2">Music Video Bingo</h1>
        <p className="mb-2 text-center max-w-md">
          This is the host & player app prototype. In a real show, players will
          scan a QR code that takes them directly to tonight&apos;s event URL.
        </p>
        <p className="text-center">
          For now, click below to open a demo event:
        </p>
      </header>
      {/* your existing buttons + rest of content stay below this */}


      <Link
        href="/event/demo"
        className="mt-2 px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
      >
        Go to Demo Event
      </Link>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 mb-1">Host tools:</p>
        <Link
          href="/host"
          className="inline-block px-3 py-1 rounded border border-blue-400 text-blue-700 text-sm font-semibold hover:bg-blue-50"
        >
          View Events (Host)
        </Link>
      </div>
    </main>
  );
}

