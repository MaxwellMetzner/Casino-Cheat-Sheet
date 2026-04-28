import { Fragment } from "react";
import {
  createRouletteColumnBet,
  createRouletteCornerBet,
  createRouletteDozenBet,
  createRouletteFirstFiveBet,
  createRouletteOutsideBet,
  createRouletteSixLineBet,
  createRouletteSplitBet,
  createRouletteStraightUpBet,
  createRouletteStreetBet,
  roulettePocketColor,
  type RouletteKind,
  type RoulettePlacedBet,
  type RoulettePocket,
} from "casino-engine";
import styles from "./casino-dashboard.module.css";

interface RouletteBoardStageProps {
  rouletteKind: RouletteKind;
  stakeForBet: (id: string) => number;
  addChip: (bet: RoulettePlacedBet) => void;
  removeChip: (id: string, amount?: number) => void;
}

interface BoardRect {
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  shape: "cell" | "spot";
}

const BOARD_CONTENT_Y_OFFSET = 34;

function shiftBoardY(value: number) {
  return value - BOARD_CONTENT_Y_OFFSET;
}

const BOARD = {
  width: 1000,
  height: 860,
  zero: {
    x: 60,
    y: shiftBoardY(105),
    width: 120,
    height: 504,
  },
  topLine: {
    x: 60,
    y: shiftBoardY(630),
    width: 120,
    height: 188,
  },
  grid: {
    x: 200,
    y: shiftBoardY(105),
    cellWidth: 170,
    cellHeight: 42,
    rows: 12,
    columns: 3,
  },
  street: {
    x: 710,
    y: shiftBoardY(105),
    width: 88,
  },
  outside: {
    x: 200,
    y: shiftBoardY(630),
    width: 598,
    dozenHeight: 56,
    columnHeight: 56,
    evenHeight: 76,
  },
} as const;

const BOARD_ROWS = Array.from({ length: 12 }, (_, rowIndex) => {
  const rowStart = (rowIndex * 3) + 1;

  return {
    rowIndex,
    rowStart,
    numbers: [rowStart, rowStart + 1, rowStart + 2].map((value) => String(value) as RoulettePocket),
    horizontalSplits: [
      {
        first: String(rowStart) as RoulettePocket,
        second: String(rowStart + 1) as RoulettePocket,
        label: `${rowStart}-${rowStart + 1}`,
        columnIndex: 0,
      },
      {
        first: String(rowStart + 1) as RoulettePocket,
        second: String(rowStart + 2) as RoulettePocket,
        label: `${rowStart + 1}-${rowStart + 2}`,
        columnIndex: 1,
      },
    ],
    verticalSplits: rowIndex < 11
      ? [0, 1, 2].map((columnIndex) => ({
        first: String(rowStart + columnIndex) as RoulettePocket,
        second: String(rowStart + columnIndex + 3) as RoulettePocket,
        label: `${rowStart + columnIndex}-${rowStart + columnIndex + 3}`,
        columnIndex,
      }))
      : [],
    corners: rowIndex < 11
      ? [0, 1].map((columnIndex) => ({
        topLeft: rowStart + columnIndex,
        label: `${rowStart + columnIndex}-${rowStart + columnIndex + 1}-${rowStart + columnIndex + 3}-${rowStart + columnIndex + 4}`,
        columnIndex,
      }))
      : [],
    streetLabel: `${rowStart}-${rowStart + 2}`,
    sixLine: rowIndex < 11
      ? {
        rowStart,
        label: `${rowStart}-${rowStart + 5}`,
      }
      : null,
  };
});

const EVEN_MONEY_ZONES = [
  { key: "low", label: "1 TO 18", stakeId: "evenMoney:1-18", selection: "low" },
  { key: "even", label: "EVEN", stakeId: "evenMoney:Even", selection: "even" },
  { key: "red", label: "RED", stakeId: "evenMoney:Red", selection: "red" },
  { key: "black", label: "BLACK", stakeId: "evenMoney:Black", selection: "black" },
  { key: "odd", label: "ODD", stakeId: "evenMoney:Odd", selection: "odd" },
  { key: "high", label: "19 TO 36", stakeId: "evenMoney:19-36", selection: "high" },
] as const;

const DISPLAY_FONT = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif';

function formatChipStake(stake: number) {
  return Number.isInteger(stake) ? String(stake) : stake.toFixed(1).replace(/\.0$/, "");
}

function numberRect(rowIndex: number, columnIndex: number): BoardRect {
  return {
    x: BOARD.grid.x + (columnIndex * BOARD.grid.cellWidth) + 9,
    y: BOARD.grid.y + (rowIndex * BOARD.grid.cellHeight) + 7,
    width: BOARD.grid.cellWidth - 18,
    height: BOARD.grid.cellHeight - 14,
    layer: 1,
    shape: "cell",
  };
}

function horizontalSplitRect(rowIndex: number, columnIndex: number): BoardRect {
  return {
    x: BOARD.grid.x + ((columnIndex + 1) * BOARD.grid.cellWidth) - 15,
    y: BOARD.grid.y + (rowIndex * BOARD.grid.cellHeight) + 6,
    width: 30,
    height: BOARD.grid.cellHeight - 12,
    layer: 3,
    shape: "spot",
  };
}

function verticalSplitRect(rowIndex: number, columnIndex: number): BoardRect {
  return {
    x: BOARD.grid.x + (columnIndex * BOARD.grid.cellWidth) + 7,
    y: BOARD.grid.y + ((rowIndex + 1) * BOARD.grid.cellHeight) - 15,
    width: BOARD.grid.cellWidth - 14,
    height: 30,
    layer: 3,
    shape: "spot",
  };
}

function cornerRect(rowIndex: number, columnIndex: number): BoardRect {
  return {
    x: BOARD.grid.x + ((columnIndex + 1) * BOARD.grid.cellWidth) - 18,
    y: BOARD.grid.y + ((rowIndex + 1) * BOARD.grid.cellHeight) - 18,
    width: 36,
    height: 36,
    layer: 4,
    shape: "spot",
  };
}

function streetRect(rowIndex: number): BoardRect {
  return {
    x: BOARD.street.x + 8,
    y: BOARD.street.y + (rowIndex * BOARD.grid.cellHeight) + 6,
    width: BOARD.street.width - 16,
    height: BOARD.grid.cellHeight - 12,
    layer: 2,
    shape: "cell",
  };
}

function sixLineRect(rowIndex: number): BoardRect {
  return {
    x: BOARD.street.x + 8,
    y: BOARD.street.y + ((rowIndex + 1) * BOARD.grid.cellHeight) - 16,
    width: BOARD.street.width - 16,
    height: 32,
    layer: 3,
    shape: "cell",
  };
}

function pocketFill(pocket: RoulettePocket) {
  const color = roulettePocketColor(pocket);

  if (color === "red") {
    return "#92251e";
  }

  if (color === "black") {
    return "#171d20";
  }

  return "#13533f";
}

function RouletteBoardHotspot({
  label,
  stake,
  rect,
  onAdd,
  onRemove,
}: {
  label: string;
  stake: number;
  rect: BoardRect;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const chipCenterX = rect.x + (rect.width / 2);
  const chipCenterY = rect.y + (rect.height / 2);
  const chipRadius = rect.shape === "spot" ? 16 : 19;

  return (
    <g
      className={[
        styles.rouletteBoardHotspot,
        rect.shape === "spot" ? styles.rouletteBoardHotspotSpot : styles.rouletteBoardHotspotCell,
        stake > 0 ? styles.rouletteBoardHotspotActive : "",
      ].filter(Boolean).join(" ")}
      role="button"
      tabIndex={0}
      aria-label={`${label}. ${stake > 0 ? `${formatChipStake(stake)} unit${stake === 1 ? "" : "s"} placed.` : "No chips placed."} Left click adds one chip. Right click or Delete removes one chip.`}
      onClick={onAdd}
      onKeyDown={(event) => {
        if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          onRemove();
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onRemove();
      }}
    >
      <title>{`${label}: left click adds 1u, right click removes 1u`}</title>
      <rect
        className={styles.rouletteBoardHotspotRect}
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        rx={rect.shape === "spot" ? 999 : 16}
        ry={rect.shape === "spot" ? 999 : 16}
      />
      {stake > 0 ? (
        <g className={styles.rouletteBoardChip} transform={`translate(${chipCenterX} ${chipCenterY})`}>
          <circle className={styles.rouletteBoardChipShadow} r={chipRadius + 4} />
          <circle className={styles.rouletteBoardChipOuter} r={chipRadius} />
          <circle className={styles.rouletteBoardChipInner} r={chipRadius - 4} />
          <text className={styles.rouletteBoardChipText} textAnchor="middle" dominantBaseline="central">
            {formatChipStake(stake)}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function RouletteBoardArtwork({ rouletteKind }: { rouletteKind: RouletteKind }) {
  const gradientId = `roulette-board-${rouletteKind}`;
  const panelId = `roulette-panel-${rouletteKind}`;
  const railId = `roulette-rail-${rouletteKind}`;
  const goldId = `roulette-gold-${rouletteKind}`;
  const evenMoneyRowY = BOARD.outside.y + BOARD.outside.dozenHeight + BOARD.outside.columnHeight;

  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#123c31" />
          <stop offset="55%" stopColor="#0d2f26" />
          <stop offset="100%" stopColor="#08211a" />
        </linearGradient>
        <linearGradient id={panelId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#185842" />
          <stop offset="100%" stopColor="#0e3d2f" />
        </linearGradient>
        <linearGradient id={railId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0a1814" />
          <stop offset="100%" stopColor="#030907" />
        </linearGradient>
        <linearGradient id={goldId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f3dfae" />
          <stop offset="55%" stopColor="#c9a45b" />
          <stop offset="100%" stopColor="#8b6527" />
        </linearGradient>
      </defs>

      <rect x="18" y="18" width="964" height="824" rx="40" fill="rgba(2, 8, 6, 0.26)" />
      <rect x="26" y="26" width="948" height="808" rx="34" fill={`url(#${railId})`} />
      <rect x="38" y="38" width="924" height="784" rx="28" fill={`url(#${gradientId})`} />
      <rect x="38" y="38" width="924" height="784" rx="28" fill="none" stroke={`url(#${goldId})`} strokeWidth="2" opacity="0.85" />
      <rect x="52" y="52" width="896" height="756" rx="22" fill="none" stroke="rgba(245, 231, 198, 0.12)" strokeWidth="1.5" />

      <rect x={BOARD.zero.x} y={BOARD.zero.y} width={BOARD.zero.width} height={BOARD.zero.height} rx="22" fill={`url(#${panelId})`} />
      <rect x={BOARD.street.x} y={BOARD.street.y} width={BOARD.street.width} height={BOARD.grid.cellHeight * BOARD.grid.rows} rx="18" fill={`url(#${panelId})`} opacity="0.9" />
      <rect x={BOARD.topLine.x} y={BOARD.topLine.y} width={BOARD.topLine.width} height={BOARD.topLine.height} rx="18" fill={`url(#${panelId})`} opacity="0.92" />
      <rect x={BOARD.outside.x} y={BOARD.outside.y} width={BOARD.outside.width} height={BOARD.outside.dozenHeight} rx="18" fill={`url(#${panelId})`} opacity="0.94" />
      <rect x={BOARD.outside.x} y={BOARD.outside.y + BOARD.outside.dozenHeight} width={BOARD.outside.width} height={BOARD.outside.columnHeight} rx="18" fill={`url(#${panelId})`} opacity="0.9" />
      <rect x={BOARD.outside.x} y={evenMoneyRowY} width={BOARD.outside.width} height={BOARD.outside.evenHeight} rx="18" fill={`url(#${panelId})`} opacity="0.96" />

      {BOARD_ROWS.map((row) => (
        <Fragment key={`art-${row.rowStart}`}>
          {row.numbers.map((pocket, columnIndex) => {
            const x = BOARD.grid.x + (columnIndex * BOARD.grid.cellWidth);
            const y = BOARD.grid.y + (row.rowIndex * BOARD.grid.cellHeight);

            return (
              <Fragment key={`pocket-${pocket}`}>
                <rect
                  x={x}
                  y={y}
                  width={BOARD.grid.cellWidth}
                  height={BOARD.grid.cellHeight}
                  fill={pocketFill(pocket)}
                  stroke={`url(#${goldId})`}
                  strokeWidth="2"
                  rx="12"
                />
                <text
                  x={x + (BOARD.grid.cellWidth / 2)}
                  y={y + 27}
                  textAnchor="middle"
                  fill="#f7eed8"
                  fontFamily={DISPLAY_FONT}
                  fontWeight="700"
                  fontSize="19"
                >
                  {pocket}
                </text>
              </Fragment>
            );
          })}

          <rect
            x={BOARD.street.x}
            y={BOARD.street.y + (row.rowIndex * BOARD.grid.cellHeight)}
            width={BOARD.street.width}
            height={BOARD.grid.cellHeight}
            rx="12"
            fill="rgba(245, 231, 198, 0.04)"
            stroke="rgba(243, 223, 174, 0.22)"
            strokeWidth="1.5"
          />
        </Fragment>
      ))}

      {rouletteKind === "american" ? (
        <>
          <rect x="70" y={shiftBoardY(115)} width="100" height="238" rx="18" fill="#13533f" stroke={`url(#${goldId})`} strokeWidth="2" />
          <rect x="70" y={shiftBoardY(361)} width="100" height="238" rx="18" fill="#13533f" stroke={`url(#${goldId})`} strokeWidth="2" />
          <text x="120" y={shiftBoardY(246)} textAnchor="middle" fill="#f7eed8" fontFamily={DISPLAY_FONT} fontWeight="700" fontSize="34">0</text>
          <text x="120" y={shiftBoardY(492)} textAnchor="middle" fill="#f7eed8" fontFamily={DISPLAY_FONT} fontWeight="700" fontSize="34">00</text>
          <text x="120" y={shiftBoardY(682)} textAnchor="middle" fill="#f7eed8" fontFamily={DISPLAY_FONT} fontWeight="700" fontSize="18">TOP LINE</text>
          <text x="120" y={shiftBoardY(722)} textAnchor="middle" fill="#f7eed8" fontFamily={DISPLAY_FONT} fontWeight="700" fontSize="17">0-00-1-2-3</text>
          <text x="120" y={shiftBoardY(754)} textAnchor="middle" fill="rgba(247, 238, 216, 0.75)" fontFamily={DISPLAY_FONT} fontSize="12">American only</text>
        </>
      ) : (
        <>
          <rect x="70" y={shiftBoardY(115)} width="100" height="484" rx="18" fill="#13533f" stroke={`url(#${goldId})`} strokeWidth="2" />
          <text x="120" y={shiftBoardY(363)} textAnchor="middle" fill="#f7eed8" fontFamily={DISPLAY_FONT} fontWeight="700" fontSize="40">0</text>
          <text x="120" y={shiftBoardY(694)} textAnchor="middle" fill="#f7eed8" fontFamily={DISPLAY_FONT} fontWeight="700" fontSize="18">SINGLE ZERO</text>
          <text x="120" y={shiftBoardY(726)} textAnchor="middle" fill="rgba(247, 238, 216, 0.75)" fontFamily={DISPLAY_FONT} fontSize="12">European board</text>
        </>
      )}

      {[0, 1, 2].map((index) => {
        const x = BOARD.outside.x + ((BOARD.outside.width / 3) * index);

        return (
          <Fragment key={`outside-rows-${index}`}>
            <rect
              x={x}
              y={BOARD.outside.y}
              width={BOARD.outside.width / 3}
              height={BOARD.outside.dozenHeight}
              fill="rgba(245, 231, 198, 0.03)"
              stroke={`url(#${goldId})`}
              strokeWidth="1.5"
              rx="14"
            />
            <rect
              x={x}
              y={BOARD.outside.y + BOARD.outside.dozenHeight}
              width={BOARD.outside.width / 3}
              height={BOARD.outside.columnHeight}
              fill="rgba(245, 231, 198, 0.03)"
              stroke={`url(#${goldId})`}
              strokeWidth="1.5"
              rx="14"
            />
          </Fragment>
        );
      })}

      {EVEN_MONEY_ZONES.map((zone, index) => {
        const zoneWidth = BOARD.outside.width / EVEN_MONEY_ZONES.length;
        const x = BOARD.outside.x + (zoneWidth * index);
        const fill = zone.key === "red"
          ? "#92251e"
          : zone.key === "black"
            ? "#171d20"
            : "rgba(245, 231, 198, 0.03)";

        return (
          <rect
            key={`outside-even-${zone.key}`}
            x={x}
            y={evenMoneyRowY}
            width={zoneWidth}
            height={BOARD.outside.evenHeight}
            fill={fill}
            stroke={`url(#${goldId})`}
            strokeWidth="1.5"
            rx="14"
          />
        );
      })}

      {["1st 12", "2nd 12", "3rd 12"].map((label, index) => (
        <text
          key={`dozen-label-${label}`}
          x={BOARD.outside.x + ((BOARD.outside.width / 3) * index) + (BOARD.outside.width / 6)}
          y={BOARD.outside.y + 36}
          textAnchor="middle"
          fill="#f7eed8"
          fontFamily={DISPLAY_FONT}
          fontWeight="700"
          fontSize="18"
        >
          {label}
        </text>
      ))}

      {[1, 2, 3].map((column, index) => (
        <text
          key={`column-label-${column}`}
          x={BOARD.outside.x + ((BOARD.outside.width / 3) * index) + (BOARD.outside.width / 6)}
          y={BOARD.outside.y + BOARD.outside.dozenHeight + 36}
          textAnchor="middle"
          fill="#f7eed8"
          fontFamily={DISPLAY_FONT}
          fontWeight="700"
          fontSize="18"
        >
          2 TO 1
        </text>
      ))}

      {EVEN_MONEY_ZONES.map((zone, index) => (
        <text
          key={`even-label-${zone.key}`}
          x={BOARD.outside.x + ((BOARD.outside.width / EVEN_MONEY_ZONES.length) * index) + (BOARD.outside.width / (EVEN_MONEY_ZONES.length * 2))}
          y={evenMoneyRowY + 45}
          textAnchor="middle"
          fill="#f7eed8"
          fontFamily={DISPLAY_FONT}
          fontWeight="700"
          fontSize="18"
        >
          {zone.label}
        </text>
      ))}
    </>
  );
}

export function RouletteBoardStage({ rouletteKind, stakeForBet, addChip, removeChip }: RouletteBoardStageProps) {
  return (
    <svg className={styles.rouletteBoardCanvas} viewBox={`0 0 ${BOARD.width} ${BOARD.height}`}>
      <RouletteBoardArtwork rouletteKind={rouletteKind} />

      {rouletteKind === "american" ? (
        <>
          <RouletteBoardHotspot
            label="0 straight up"
            stake={stakeForBet("straightUp:0")}
            rect={{ x: 70, y: shiftBoardY(115), width: 100, height: 238, layer: 1, shape: "cell" }}
            onAdd={() => addChip(createRouletteStraightUpBet(rouletteKind, "0"))}
            onRemove={() => removeChip("straightUp:0")}
          />
          <RouletteBoardHotspot
            label="00 straight up"
            stake={stakeForBet("straightUp:00")}
            rect={{ x: 70, y: shiftBoardY(361), width: 100, height: 238, layer: 1, shape: "cell" }}
            onAdd={() => addChip(createRouletteStraightUpBet(rouletteKind, "00"))}
            onRemove={() => removeChip("straightUp:00")}
          />
          <RouletteBoardHotspot
            label="0-00-1-2-3"
            stake={stakeForBet("firstFiveAmerican:0-00-1-2-3")}
            rect={{ x: 70, y: shiftBoardY(640), width: 100, height: 168, layer: 1, shape: "cell" }}
            onAdd={() => addChip(createRouletteFirstFiveBet())}
            onRemove={() => removeChip("firstFiveAmerican:0-00-1-2-3")}
          />
        </>
      ) : (
        <RouletteBoardHotspot
          label="0 straight up"
          stake={stakeForBet("straightUp:0")}
          rect={{ x: 70, y: shiftBoardY(115), width: 100, height: 484, layer: 1, shape: "cell" }}
          onAdd={() => addChip(createRouletteStraightUpBet(rouletteKind, "0"))}
          onRemove={() => removeChip("straightUp:0")}
        />
      )}

      {BOARD_ROWS.map((row) => (
        <Fragment key={`hotspots-${row.rowStart}`}>
          {row.numbers.map((pocket, columnIndex) => {
            const stakeId = `straightUp:${pocket}`;

            return (
              <RouletteBoardHotspot
                key={stakeId}
                label={`${pocket} straight up`}
                stake={stakeForBet(stakeId)}
                rect={numberRect(row.rowIndex, columnIndex)}
                onAdd={() => addChip(createRouletteStraightUpBet(rouletteKind, pocket))}
                onRemove={() => removeChip(stakeId)}
              />
            );
          })}

          {row.horizontalSplits.map((split) => {
            const stakeId = `split:${split.label}`;

            return (
              <RouletteBoardHotspot
                key={stakeId}
                label={`Split ${split.label}`}
                stake={stakeForBet(stakeId)}
                rect={horizontalSplitRect(row.rowIndex, split.columnIndex)}
                onAdd={() => addChip(createRouletteSplitBet(rouletteKind, split.first, split.second))}
                onRemove={() => removeChip(stakeId)}
              />
            );
          })}

          <RouletteBoardHotspot
            label={`Street ${row.streetLabel}`}
            stake={stakeForBet(`street:${row.streetLabel}`)}
            rect={streetRect(row.rowIndex)}
            onAdd={() => addChip(createRouletteStreetBet(rouletteKind, row.rowStart))}
            onRemove={() => removeChip(`street:${row.streetLabel}`)}
          />

          {row.verticalSplits.map((split) => {
            const stakeId = `split:${split.label}`;

            return (
              <RouletteBoardHotspot
                key={stakeId}
                label={`Split ${split.label}`}
                stake={stakeForBet(stakeId)}
                rect={verticalSplitRect(row.rowIndex, split.columnIndex)}
                onAdd={() => addChip(createRouletteSplitBet(rouletteKind, split.first, split.second))}
                onRemove={() => removeChip(stakeId)}
              />
            );
          })}

          {row.corners.map((corner) => {
            const stakeId = `corner:${corner.label}`;

            return (
              <RouletteBoardHotspot
                key={stakeId}
                label={`Corner ${corner.label}`}
                stake={stakeForBet(stakeId)}
                rect={cornerRect(row.rowIndex, corner.columnIndex)}
                onAdd={() => addChip(createRouletteCornerBet(rouletteKind, corner.topLeft))}
                onRemove={() => removeChip(stakeId)}
              />
            );
          })}

          {row.sixLine ? (() => {
            const sixLine = row.sixLine;

            return (
              <RouletteBoardHotspot
                label={`Six line ${sixLine.label}`}
                stake={stakeForBet(`sixLine:${sixLine.label}`)}
                rect={sixLineRect(row.rowIndex)}
                onAdd={() => addChip(createRouletteSixLineBet(rouletteKind, sixLine.rowStart))}
                onRemove={() => removeChip(`sixLine:${sixLine.label}`)}
              />
            );
          })() : null}
        </Fragment>
      ))}

      {[1, 2, 3].map((dozen, index) => {
        const zoneWidth = BOARD.outside.width / 3;
        const stakeId = `dozen:${((dozen - 1) * 12) + 1}-${dozen * 12}`;

        return (
          <RouletteBoardHotspot
            key={`dozen-${dozen}`}
            label={`Dozen ${((dozen - 1) * 12) + 1}-${dozen * 12}`}
            stake={stakeForBet(stakeId)}
            rect={{
              x: BOARD.outside.x + (zoneWidth * index),
              y: BOARD.outside.y,
              width: zoneWidth,
              height: BOARD.outside.dozenHeight,
              layer: 1,
              shape: "cell",
            }}
            onAdd={() => addChip(createRouletteDozenBet(rouletteKind, dozen as 1 | 2 | 3))}
            onRemove={() => removeChip(stakeId)}
          />
        );
      })}

      {[1, 2, 3].map((column, index) => {
        const zoneWidth = BOARD.outside.width / 3;
        const stakeId = `dozen:Column ${column}`;

        return (
          <RouletteBoardHotspot
            key={`column-${column}`}
            label={`Column ${column}`}
            stake={stakeForBet(stakeId)}
            rect={{
              x: BOARD.outside.x + (zoneWidth * index),
              y: BOARD.outside.y + BOARD.outside.dozenHeight,
              width: zoneWidth,
              height: BOARD.outside.columnHeight,
              layer: 1,
              shape: "cell",
            }}
            onAdd={() => addChip(createRouletteColumnBet(rouletteKind, column as 1 | 2 | 3))}
            onRemove={() => removeChip(stakeId)}
          />
        );
      })}

      {EVEN_MONEY_ZONES.map((zone, index) => {
        const zoneWidth = BOARD.outside.width / EVEN_MONEY_ZONES.length;

        return (
          <RouletteBoardHotspot
            key={zone.key}
            label={zone.label}
            stake={stakeForBet(zone.stakeId)}
            rect={{
              x: BOARD.outside.x + (zoneWidth * index),
              y: BOARD.outside.y + BOARD.outside.dozenHeight + BOARD.outside.columnHeight,
              width: zoneWidth,
              height: BOARD.outside.evenHeight,
              layer: 1,
              shape: "cell",
            }}
            onAdd={() => addChip(createRouletteOutsideBet(rouletteKind, zone.selection))}
            onRemove={() => removeChip(zone.stakeId)}
          />
        );
      })}
    </svg>
  );
}
