import Image from "next/image";
import { Manrope } from "next/font/google";
import styles from "./SubstitutionCardSheet.module.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export type SubstitutionCardProps = {
  teamName: string;
  dateStr: string;
};

export function SubstitutionCard({ teamName, dateStr }: SubstitutionCardProps) {
  return (
    <div
      className={`${styles.card} ${manrope.variable}`}
      style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
    >
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Dasani Powerade Youth Substitution Card</h2>
        <Image
          src="/team-sheet/nyc.jpeg"
          alt="BFA National Youth Cup"
          width={54}
          height={54}
          className={styles.nycLogo}
          unoptimized
        />
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.fieldCell}>
          <span className={styles.fieldLbl}>Match No:</span>
          <span className={styles.fieldLine} />
        </div>
        <div className={styles.fieldCell}>
          <span className={styles.fieldLbl}>Date:</span>
          <span className={styles.fieldLine}>{dateStr}</span>
        </div>
      </div>

      <div className={`${styles.fieldRow} ${styles.fieldRowSingle}`}>
        <div className={styles.fieldCell}>
          <span className={styles.fieldLbl}>Team:</span>
          <span className={styles.fieldLine}>{teamName}</span>
        </div>
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.fieldCell}>
          <span className={styles.fieldLbl}>Player out:</span>
          <span className={styles.fieldLine} />
        </div>
        <div className={styles.fieldCell}>
          <span className={styles.fieldLbl}>Kit No:</span>
          <span className={styles.fieldLine} />
        </div>
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.fieldCell}>
          <span className={styles.fieldLbl}>Player in:</span>
          <span className={styles.fieldLine} />
        </div>
        <div className={styles.fieldCell}>
          <span className={styles.fieldLbl}>Kit No:</span>
          <span className={styles.fieldLine} />
        </div>
      </div>

      <div className={`${styles.fieldRow} ${styles.fieldRowSingle}`}>
        <div className={styles.fieldCell}>
          <span className={styles.fieldLbl}>Coach/Manager&apos;s signature:</span>
          <span className={styles.fieldLine} />
        </div>
      </div>

      <div className={styles.officialBand}>
        <div className={styles.officialBandTitle}>For official use only</div>
        <div className={`${styles.fieldRow} ${styles.fieldRowSingle}`}>
          <div className={styles.fieldCell}>
            <span className={styles.fieldLbl}>Time of substitution:</span>
            <span className={styles.fieldLine} />
          </div>
        </div>
        <div className={`${styles.fieldRow} ${styles.fieldRowSingle}`}>
          <div className={styles.fieldCell}>
            <span className={styles.fieldLbl}>Match official&apos;s signature:</span>
            <span className={styles.fieldLine} />
          </div>
        </div>
      </div>
    </div>
  );
}
