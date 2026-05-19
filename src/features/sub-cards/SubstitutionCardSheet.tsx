import { SubstitutionCard } from "./SubstitutionCard";
import styles from "./SubstitutionCardSheet.module.css";

export type SubstitutionCardSheetProps = {
  teamName: string;
  dateStr: string;
};

export function SubstitutionCardSheet({
  teamName,
  dateStr,
}: SubstitutionCardSheetProps) {
  return (
    <div className={styles.sheet}>
      <div className={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.cell}>
            <SubstitutionCard teamName={teamName} dateStr={dateStr} />
          </div>
        ))}
      </div>
    </div>
  );
}
