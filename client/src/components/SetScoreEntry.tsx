/**
 * SetScoreEntry — best-of-3 sets score entry component.
 *
 * Competition-specific scoring rules:
 *   All sets: first to 6 games. At 5-5 a tiebreak is played.
 *   Tiebreak result: the set ends 6-5 (winner) or 5-6 (loser).
 *   Valid set scores: 6-0, 6-1, 6-2, 6-3, 6-4, 6-5 (tiebreak).
 *   7-5 and 7-6 are NOT valid — there is no advantage set or standard tiebreak.
 *   Third set uses the same rule as sets 1 and 2.
 *   Winner is determined automatically from the set scores.
 *
 * onChange fires on every change with a ScoreResult describing validity,
 * the formatted score string, and the computed winner ("A" = my team).
 */

import { useState, useEffect } from "react";

interface SetScore {
  myGames: string;
  oppGames: string;
}

const emptySet = (): SetScore => ({ myGames: "", oppGames: "" });

export interface ScoreResult {
  /** Formatted score string, e.g. "6-4 3-6 10-7" */
  scoreString: string;
  /** "A" = my team won, "B" = opponents won, null = indeterminate */
  winner: "A" | "B" | null;
  /** True when the score is complete and valid enough to submit */
  valid: boolean;
  /** Human-readable validation message */
  message: string;
}

interface Props {
  onChange: (result: ScoreResult) => void;
}

function parseGames(val: string): number | null {
  if (val === "" || val === undefined) return null;
  const n = parseInt(val, 10);
  return isNaN(n) || n < 0 ? null : n;
}

/**
 * Validates a set score under competition rules:
 *   Tiebreak at 5-5. The set ends 6-5 (winner) — not 7-5 or 7-6.
 *   Valid scores: 6-0, 6-1, 6-2, 6-3, 6-4, 6-5.
 *   Same rule applies to all three sets.
 */
function validateSet(my: number, opp: number): { valid: boolean; error?: string } {
  if (my < 0 || opp < 0) return { valid: false, error: "Games cannot be negative." };

  const hi = Math.max(my, opp);
  const lo = Math.min(my, opp);

  // Valid: 6-x where x is 0–5
  if (hi === 6 && lo <= 5) return { valid: true };

  // Incomplete
  if (hi < 6) return { valid: false, error: `Score ${my}-${opp} is incomplete — a set must reach 6 games.` };

  // 7-5: not valid in this competition (tiebreak is played at 5-5, set ends 6-5)
  if (hi === 7 && lo === 5) return { valid: false, error: `Score ${my}-${opp} is not valid in this competition — at 5-5 a tiebreak is played and the set ends 6-5.` };

  // 7-6: not valid
  if (hi === 7 && lo === 6) return { valid: false, error: `Score ${my}-${opp} is not valid — tiebreak is played at 5-5 and the set ends 6-5.` };

  // 6-6 would never be reached
  if (hi === 6 && lo === 6) return { valid: false, error: `Score 6-6 is not valid — at 5-5 a tiebreak decides the set (ends 6-5).` };

  return { valid: false, error: `Score ${my}-${opp} is not a valid set score.` };
}

// No match tiebreak in this competition — third set uses the same rules as sets 1 and 2.

function setWinner(my: number, opp: number): "A" | "B" {
  return my > opp ? "A" : "B";
}

export default function SetScoreEntry({ onChange }: Props) {
  const [set1, setSet1] = useState<SetScore>(emptySet());
  const [set2, setSet2] = useState<SetScore>(emptySet());
  const [set3, setSet3] = useState<SetScore>(emptySet());
  const [showSet3, setShowSet3] = useState(false);
  const [errors, setErrors] = useState<{ set1?: string; set2?: string; set3?: string }>({});

  useEffect(() => {
    const s1my = parseGames(set1.myGames);
    const s1opp = parseGames(set1.oppGames);
    const s2my = parseGames(set2.myGames);
    const s2opp = parseGames(set2.oppGames);

    const newErrors: typeof errors = {};

    // Need both sets filled to proceed
    if (s1my === null || s1opp === null || s2my === null || s2opp === null) {
      setErrors(newErrors);
      setShowSet3(false);
      onChange({ scoreString: "", winner: null, valid: false, message: "Enter scores for Set 1 and Set 2." });
      return;
    }

    // Validate set 1
    const v1 = validateSet(s1my, s1opp);
    if (!v1.valid) {
      newErrors.set1 = v1.error;
      setErrors(newErrors);
      onChange({ scoreString: "", winner: null, valid: false, message: v1.error ?? "Invalid Set 1 score." });
      return;
    }

    // Validate set 2
    const v2 = validateSet(s2my, s2opp);
    if (!v2.valid) {
      newErrors.set2 = v2.error;
      setErrors(newErrors);
      onChange({ scoreString: "", winner: null, valid: false, message: v2.error ?? "Invalid Set 2 score." });
      return;
    }

    const w1 = setWinner(s1my, s1opp);
    const w2 = setWinner(s2my, s2opp);

    // Same player won both sets → match over, no set 3
    if (w1 === w2) {
      setErrors({});
      setShowSet3(false);
      const score = `${s1my}-${s1opp} ${s2my}-${s2opp}`;
      onChange({ scoreString: score, winner: w1, valid: true, message: "" });
      return;
    }

    // Split sets → need match tiebreak (set 3)
    setShowSet3(true);

    const s3my = parseGames(set3.myGames);
    const s3opp = parseGames(set3.oppGames);

    if (s3my === null || s3opp === null) {
      setErrors(newErrors);
      onChange({ scoreString: "", winner: null, valid: false, message: "Sets are level — enter the Set 3 score." });
      return;
    }

    const v3 = validateSet(s3my, s3opp);
    if (!v3.valid) {
      newErrors.set3 = v3.error;
      setErrors(newErrors);
      onChange({ scoreString: "", winner: null, valid: false, message: v3.error ?? "Invalid Set 3 score." });
      return;
    }

    const w3 = setWinner(s3my, s3opp);
    setErrors({});
    const score = `${s1my}-${s1opp} ${s2my}-${s2opp} ${s3my}-${s3opp}`;
    onChange({ scoreString: score, winner: w3, valid: true, message: "" });
  }, [set1, set2, set3]);

  const inputCls =
    "w-14 border border-gray-200 rounded-lg px-1 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#1b4332] appearance-none";
  const inputErrCls =
    "w-14 border border-red-300 rounded-lg px-1 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-red-400 appearance-none";

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <span className="w-28 flex-shrink-0" />
        <div className="flex items-center gap-2">
          <span className="w-14 text-xs font-semibold text-[#1b4332] text-center">My team</span>
          <span className="w-4" />
          <span className="w-14 text-xs font-semibold text-gray-500 text-center">Opponents</span>
        </div>
      </div>

      {/* Set 1 */}
      <SetRow
        label="Set 1"
        value={set1}
        onChange={setSet1}
        inputCls={errors.set1 ? inputErrCls : inputCls}
        error={errors.set1}
      />

      {/* Set 2 */}
      <SetRow
        label="Set 2"
        value={set2}
        onChange={setSet2}
        inputCls={errors.set2 ? inputErrCls : inputCls}
        error={errors.set2}
      />

      {/* Set 3 — match tiebreak, only shown when sets are split */}
      {showSet3 && (
        <SetRow
          label="Set 3"
          value={set3}
          onChange={setSet3}
          inputCls={errors.set3 ? inputErrCls : inputCls}
          error={errors.set3}
          hint="Tiebreak at 5-5 (ends 6-5)"
        />
      )}

      {/* Scoring guide */}
      <p className="text-xs text-gray-400 leading-relaxed">
        Valid scores: 6-0, 6-1, 6-2, 6-3, 6-4, 6-5. Tiebreak played at 5-5 — set ends 6-5. Same rule applies to all sets.
      </p>
    </div>
  );
}

// ── SetRow ────────────────────────────────────────────────────────────────────

interface SetRowProps {
  label: string;
  value: SetScore;
  onChange: (v: SetScore) => void;
  inputCls: string;
  error?: string;
  hint?: string;
}

function SetRow({ label, value, onChange, inputCls, error, hint }: SetRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-gray-500 w-28 flex-shrink-0">{label}</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={99}
            value={value.myGames}
            onChange={(e) => onChange({ ...value, myGames: e.target.value })}
            placeholder="0"
            className={inputCls}
          />
          <span className="text-gray-400 font-bold text-base w-4 text-center">–</span>
          <input
            type="number"
            min={0}
            max={99}
            value={value.oppGames}
            onChange={(e) => onChange({ ...value, oppGames: e.target.value })}
            placeholder="0"
            className={inputCls}
          />
        </div>
        {hint && <span className="text-xs text-gray-400 ml-1">{hint}</span>}
      </div>
      {error && <p className="text-xs text-red-500 ml-28 pl-3">{error}</p>}
    </div>
  );
}
