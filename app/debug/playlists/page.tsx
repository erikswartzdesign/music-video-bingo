import { PLAYLISTS } from "@/lib/eventConfig";

export default function PlaylistDebugPage() {
  return (
    <main className="min-h-screen p-6 bg-black text-gray-100">
      <h1 className="text-2xl font-bold mb-4">Playlist Debug View</h1>
      <p className="text-sm text-gray-400 mb-6">
        This page shows all configured playlists and their items as the app sees
        them. Use it to verify that the data matches your Excel sheets.
      </p>

      <div className="space-y-8">
        {PLAYLISTS.map((playlist) => (
          <section
            key={playlist.id}
            className="border border-slate-700 rounded-lg p-4 shadow-sm bg-slate-900"
          >
            <div className="flex flex-wrap justify-between items-baseline gap-2 mb-3">
              <h2 className="text-lg font-semibold">
                {playlist.name}{" "}
                <span className="text-xs text-gray-500">({playlist.id})</span>
              </h2>
              <span className="text-xs text-gray-400">
                Mode: {playlist.displayMode} • Items: {playlist.items.length}
              </span>
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-slate-700 rounded">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-800 sticky top-0">
                  <tr className="text-left border-b border-slate-700">
                    <th className="px-2 py-1 w-10">#</th>
                    <th className="px-2 py-1">Title</th>
                    <th className="px-2 py-1">Artist</th>
                  </tr>
                </thead>
                <tbody>
                  {playlist.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-800 last:border-b-0 odd:bg-slate-900 even:bg-slate-950"
                    >
                      <td className="px-2 py-1 align-top text-gray-400">
                        {item.id}
                      </td>
                      <td className="px-2 py-1 align-top">{item.title}</td>
                      <td className="px-2 py-1 align-top text-gray-300">
                        {item.artist}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
