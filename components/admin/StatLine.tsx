// エディトリアル風ステータス表示（ドット + ラベル）。
// tone: positive / negative / pending / waiting / neutral
// 配色は styles/adore-v3.css の .statline.t-* で定義（.adore-v3 配下でのみ有効）。
export default function StatLine({ tone, label }: { tone: string; label: string }) {
  return (
    <span className={`statline t-${tone}`}>
      <i className="d" />
      {label}
    </span>
  )
}
