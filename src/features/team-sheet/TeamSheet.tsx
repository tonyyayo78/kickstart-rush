import Image from "next/image";
import { Bebas_Neue, Manrope, JetBrains_Mono } from "next/font/google";
import styles from "./TeamSheet.module.css";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const DATE_FMT = new Intl.DateTimeFormat("en-BB", {
  timeZone: "America/Barbados",
  year: "numeric",
  month: "short",
  day: "numeric",
});
const TIME_FMT = new Intl.DateTimeFormat("en-BB", {
  timeZone: "America/Barbados",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});
const ISO_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Barbados",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export type TeamSheetProps = {
  fixture: {
    homeTeamName: string;
    awayTeamName: string;
    kickoffAt: Date | null;
    venue: string | null;
    ageGroup: string;
  };
  isHomeTeam: boolean;
  starters: Array<{
    jerseyNumber: number | null;
    playerName: string;
  }>;
  subs: Array<{
    jerseyNumber: number | null;
    playerName: string;
  }>;
  coachName: string | null;
  squadCode: string;
};

const STARTER_ROWS = 11;
const SUB_ROWS = 9;

function ageGroupCode(ageGroup: string): string {
  const m = ageGroup.match(/\d+/);
  return m ? `U${m[0]}` : ageGroup.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function TeamSheet({
  fixture,
  isHomeTeam,
  starters,
  subs,
  coachName,
  squadCode,
}: TeamSheetProps) {
  const teamAName = isHomeTeam ? fixture.homeTeamName : fixture.awayTeamName;
  const teamBName = isHomeTeam ? fixture.awayTeamName : fixture.homeTeamName;

  const dateStr = fixture.kickoffAt ? DATE_FMT.format(fixture.kickoffAt) : "";
  const timeStr = fixture.kickoffAt ? TIME_FMT.format(fixture.kickoffAt) : "";
  const isoDate = fixture.kickoffAt ? ISO_DATE_FMT.format(fixture.kickoffAt) : "";

  const agCode = ageGroupCode(fixture.ageGroup);
  const refCode = `KS-${squadCode} / ${agCode} / ${isoDate}`;

  const starterRows = [...starters];
  while (starterRows.length < STARTER_ROWS)
    starterRows.push({ jerseyNumber: null, playerName: "" });

  const subRows = [...subs];
  while (subRows.length < SUB_ROWS)
    subRows.push({ jerseyNumber: null, playerName: "" });

  return (
    <div
      className={`${styles.sheet} ${bebas.variable} ${manrope.variable} ${mono.variable}`}
      style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
    >
      {/* ── Masthead ── */}
      <header className={styles.masthead}>
        <div>
          <Image
            src="/team-sheet/nyc.jpeg"
            alt="BFA National Youth Cup"
            width={86}
            height={86}
            className={styles.nycImg}
            unoptimized
          />
        </div>
        <div className={styles.centerMark}>
          <span className={styles.eyebrow}>Barbados Football Association</span>
          <span className={styles.tournamentName}>National Youth Tournament</span>
          <span className={styles.ageLabel}>{fixture.ageGroup}</span>
        </div>
        <div>
          <Image
            src="/team-sheet/bfa.png"
            alt="Barbados Football Association"
            width={92}
            height={92}
            className={styles.bfaImg}
            unoptimized
          />
        </div>
      </header>

      {/* ── Title block ── */}
      <div className={styles.titleBlock}>
        <div>
          <h1>TEAM SHEET</h1>
          <p className={styles.instructions}>
            This report must be submitted to the BFA Match Commissioner before kick-off.
            Please complete all fields in{" "}
            <strong>BLOCK CAPITALS</strong>.
          </p>
        </div>
        <div className={styles.matchBox}>
          <div className={styles.matchBoxLabel}>Match No.</div>
          <div className={styles.matchBoxVal} />
        </div>
      </div>

      {/* ── Meta strip ── */}
      <div className={styles.meta}>
        {/* Teams row */}
        <div className={`${styles.metaRow} ${styles.metaRowTeams}`}>
          <div className={styles.metaCell}>
            <span className={styles.metaLbl}>Team A</span>
            <span className={styles.metaVal}>{teamAName}</span>
          </div>
          <div className={styles.metaCell}>
            <span className={styles.metaLbl}>Team B</span>
            <span className={styles.metaVal}>{teamBName}</span>
          </div>
        </div>

        {/* Where / Date / Time */}
        <div className={`${styles.metaRow} ${styles.metaRowWhere}`}>
          <div className={styles.metaCell}>
            <span className={styles.metaLbl}>Played At</span>
            <span className={styles.metaVal}>{fixture.venue ?? ""}</span>
          </div>
          <div className={styles.metaCell}>
            <span className={styles.metaLbl}>Date</span>
            <span className={styles.metaVal}>{dateStr}</span>
          </div>
          <div className={styles.metaCell}>
            <span className={styles.metaLbl}>Time</span>
            <span className={styles.metaVal}>{timeStr}</span>
          </div>
        </div>

        {/* Half-Time */}
        <div className={`${styles.metaRow} ${styles.metaRowHt}`}>
          <div className={styles.metaCell}>
            <span className={styles.metaLbl}>Half-Time A</span>
            <span className={styles.metaVal} />
          </div>
          <div className={styles.metaCell}>
            <span className={styles.metaLbl}>Half-Time B</span>
            <span className={styles.metaVal} />
          </div>
        </div>

        {/* Refs row 1 */}
        <div className={`${styles.metaRow} ${styles.metaRowRefs}`}>
          <div className={styles.metaCell}>
            <span className={styles.metaLbl}>Referee</span>
            <span className={styles.metaVal} />
          </div>
          <div className={styles.metaCell}>
            <span className={styles.metaLbl}>Assistant 1</span>
            <span className={styles.metaVal} />
          </div>
        </div>

        {/* Refs row 2 */}
        <div className={`${styles.metaRow} ${styles.metaRowRefs}`}>
          <div className={styles.metaCell}>
            <span className={styles.metaLbl}>4th Official</span>
            <span className={styles.metaVal} />
          </div>
          <div className={styles.metaCell}>
            <span className={styles.metaLbl}>Assistant 2</span>
            <span className={styles.metaVal} />
          </div>
        </div>
      </div>

      {/* ── Starters table ── */}
      <table className={styles.playersTable}>
        <thead>
          <tr>
            <th className={styles.thNum}>#</th>
            <th className={styles.thPlayer}>Players</th>
            <th className={styles.thGoals}>Goals</th>
            <th className={styles.thTime}>Time Scored</th>
            <th className={styles.thCaut}>Cautions</th>
            <th className={styles.thExp}>Expulsion</th>
          </tr>
        </thead>
        <tbody>
          {starterRows.map((row, i) => (
            <tr key={i}>
              <td className={styles.tdNum}>{row.jerseyNumber ?? ""}</td>
              <td className={row.playerName ? styles.starterName : undefined}>
                {row.playerName}
              </td>
              <td className={styles.tdGoals} />
              <td />
              <td />
              <td />
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Subs band ── */}
      <div className={styles.subsBand}>
        <span>Substitutes</span>
      </div>

      {/* ── Subs table ── */}
      <table className={styles.playersTable}>
        <thead>
          <tr>
            <th className={styles.thNum}>#</th>
            <th className={styles.thPlayer}>Players</th>
            <th className={styles.thGoals}>Goals</th>
            <th className={styles.thTime}>Time Scored</th>
            <th className={styles.thCaut}>Cautions</th>
            <th className={styles.thExp}>Expulsion</th>
          </tr>
        </thead>
        <tbody>
          {subRows.map((row, i) => (
            <tr key={i}>
              <td className={styles.tdNum}>{row.jerseyNumber ?? ""}</td>
              <td>{row.playerName}</td>
              <td className={styles.tdGoals} />
              <td />
              <td />
              <td />
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Coach footer ── */}
      <div className={styles.coach}>
        <div className={styles.coachCell}>
          <span className={styles.coachLbl}>Coach</span>
          <span className={styles.coachVal}>{coachName ?? ""}</span>
        </div>
        <div className={styles.coachCell}>
          <span className={styles.coachLbl}>Signature</span>
          <span className={styles.coachVal} />
        </div>
      </div>

      {/* ── Page footer ── */}
      <footer className={styles.pageFooter}>
        <div className={styles.submission}>
          Submit this form to the BFA Match Commissioner before kick-off.
          <span className={styles.submissionRef}>{refCode}</span>
        </div>
        <div className={styles.ksMark}>
          <span className={styles.ksMarkLabel}>Team</span>
          <Image
            src="/team-sheet/kickstart.png"
            alt="Kickstart FC"
            width={120}
            height={56}
            className={styles.ksLogo}
            unoptimized
          />
        </div>
      </footer>
    </div>
  );
}
