"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import HostHeader from "@/components/host/HostHeader";
import ActiveEventPanel from "@/components/host/ActiveEventPanel";
import CreateActivateEventCard from "@/components/host/CreateActivateEventCard";
import EventListSection from "@/components/host/EventListSection";
import SectionDivider from "@/components/host/SectionDivider";

import { formatStartAt } from "@/lib/host/format";
import { defaultGames } from "@/lib/host/games";

import { useHostVenueDashboard } from "@/hooks/useHostVenueDashboard";

export default function HostVenueDashboardPage() {
  const params = useParams<{ venueSlug?: string }>();
  const venueSlug = params?.venueSlug ?? "";

  const {
    loading,
    errMsg,

    venueNameDisplay,

    // form
    eventDate,
    setEventDate,
    configKey,
    setConfigKey,
    eventName,
    setEventName,
    games,
    setGames,
    updateGame,

    // NEW: bonus form
    bonusPlaylistKey,
    setBonusPlaylistKey,
    bonusDisplayMode,
    setBonusDisplayMode,

    // patterns + options
    patterns,
    patternsById,
    playlistOptions,

    // lists
    activeEvent,
    scheduledEvents,
    completedEvents,

    // per-event config view/load
    expandedByCode,
    toggleExpanded,
    eventGamesByCode,
    loadConfigurationIntoForm,

    // actions
    refresh,
    createAndActivate,
    deactivateAll,

    // copy panel
    copiedKey,
    copyToClipboard,
    activeEventDisplayName,
    activePlayerWelcomeUrl,
    activeHowToPlayUrl,
    activeEventUrl,
  } = useHostVenueDashboard(venueSlug);

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 px-6 py-10">
      <div className="w-full max-w-7xl mx-auto">
        <HostHeader venueNameDisplay={venueNameDisplay} venueSlug={venueSlug} />

        {errMsg && (
          <div className="mb-6 rounded-md border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT */}
          <div className="space-y-6">
            <CreateActivateEventCard
              venueSlug={venueSlug}
              venueNameDisplay={venueNameDisplay}
              eventDate={eventDate}
              setEventDate={setEventDate}
              configKey={configKey}
              setConfigKey={setConfigKey}
              eventName={eventName}
              setEventName={setEventName}
              games={games}
              onResetDefaults={() => setGames(defaultGames())}
              onUpdateGame={updateGame}
              patterns={patterns}
              patternsById={patternsById}
              playlistOptions={playlistOptions}
              // NEW: bonus props
              bonusPlaylistKey={bonusPlaylistKey}
              setBonusPlaylistKey={setBonusPlaylistKey}
              bonusDisplayMode={bonusDisplayMode}
              setBonusDisplayMode={setBonusDisplayMode}
              onCreateAndActivate={createAndActivate}
            />

            <div className="flex gap-3">
              <Link
                href="/hosts"
                className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold bg-slate-900/40 border border-white/15 hover:bg-slate-900/55 transition"
              >
                Back to Venue List
              </Link>
            </div>
          </div>

          {/* RIGHT */}
          <section className="bg-white/10 border border-white/15 rounded-xl p-5 sm:p-6 backdrop-blur-md">
            <ActiveEventPanel
              loading={loading}
              activeEvent={activeEvent}
              venueSlug={venueSlug}
              venueNameDisplay={venueNameDisplay}
              activeEventDisplayName={activeEventDisplayName}
              activePlayerWelcomeUrl={activePlayerWelcomeUrl}
              activeHowToPlayUrl={activeHowToPlayUrl}
              activeEventUrl={activeEventUrl}
              copiedKey={copiedKey}
              onCopy={copyToClipboard}
              onRefresh={refresh}
              onEndEvent={deactivateAll}
              formatStartAt={formatStartAt}
              // NEW: give bonus editor the same dropdown options
              playlistOptions={playlistOptions}
            />

            <SectionDivider />

            <EventListSection
              title="Scheduled Events"
              subtitle="(Supabase)"
              tip="Tip: Use Load Configuration to reuse a setup, then click Create Event."
              loading={loading}
              events={scheduledEvents}
              expandedByCode={expandedByCode}
              onToggleExpanded={toggleExpanded}
              eventGamesByCode={eventGamesByCode}
              patternsById={patternsById}
              onLoadConfiguration={loadConfigurationIntoForm}
              formatStartAt={formatStartAt}
            />

            <SectionDivider />

            <EventListSection
              title="Completed Events"
              subtitle="(Supabase)"
              loading={loading}
              events={completedEvents}
              expandedByCode={expandedByCode}
              onToggleExpanded={toggleExpanded}
              eventGamesByCode={eventGamesByCode}
              patternsById={patternsById}
              onLoadConfiguration={loadConfigurationIntoForm}
              formatStartAt={formatStartAt}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
