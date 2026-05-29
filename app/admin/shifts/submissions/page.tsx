'use client';

import { useEffect, useState } from 'react';
import { getSubmittedShifts, confirmShift, generateConfirmedShiftText } from '@/lib/supabase/shifts';
import { getCurrentUser } from '@/lib/supabase/auth';

interface Submission {
  id: string;
  cast_id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  casts: { genshi_name: string };
  confirmed_start_time: string | null;
  confirmed_end_time: string | null;
}

export default function ShiftSubmissionsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [adjustedStartTime, setAdjustedStartTime] = useState('');
  const [adjustedEndTime, setAdjustedEndTime] = useState('');
  const [copyText, setCopyText] = useState('');

  useEffect(() => {
    loadSubmissions();
    // 確定者（confirmed_by）に使う現在ユーザーID を取得
    getCurrentUser().then((u) => setUserId(u?.id ?? null));
  }, []);

  async function loadSubmissions() {
    try {
      const data = await getSubmittedShifts();
      setSubmissions((data as Submission[]) || []);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!selectedSubmission || !userId) return;

    try {
      await confirmShift(
        selectedSubmission.id,
        adjustedStartTime || null,
        adjustedEndTime || null,
        userId
      );

      // 確定版テキストを生成
      const text = await generateConfirmedShiftText(selectedSubmission.cast_id);
      setCopyText(text);

      // リスト更新
      await loadSubmissions();
      setSelectedSubmission(null);
      setAdjustedStartTime('');
      setAdjustedEndTime('');
    } catch (error) {
      console.error('Failed to confirm shift:', error);
    }
  }

  if (loading) return <div className="p-4">読み込み中...</div>;

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold text-wine-red mb-6">
        シフト申告確認
      </h1>

      {/* 申告一覧 */}
      <div className="space-y-4">
        {submissions.length === 0 ? (
          <p className="text-gray-600">申告されたシフトはありません</p>
        ) : (
          submissions.map((sub) => (
            <div
              key={sub.id}
              className="p-4 bg-gray-50 rounded border-l-4 border-wine-red"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-lg">{sub.casts.genshi_name}</p>
                  <p className="text-sm text-gray-600">{sub.shift_date}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedSubmission(sub);
                    setAdjustedStartTime(sub.start_time || '');
                    setAdjustedEndTime(sub.end_time || '');
                  }}
                  className="px-4 py-2 bg-wine-red text-white rounded text-sm hover:opacity-90"
                >
                  調整
                </button>
              </div>
              <p className="text-sm text-gray-700">
                申告：{sub.start_time || 'なし'} ~ {sub.end_time || 'なし'}
              </p>
            </div>
          ))
        )}
      </div>

      {/* 調整モーダル */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-wine-red mb-4">
              {selectedSubmission.casts.genshi_name} のシフト調整
            </h2>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600 mb-1">申告内容</p>
              <p className="font-semibold">
                {selectedSubmission.shift_date}：
                {selectedSubmission.start_time || 'なし'} ~{' '}
                {selectedSubmission.end_time || 'なし'}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">
                確定開始時間
              </label>
              <input
                type="time"
                value={adjustedStartTime}
                onChange={(e) => setAdjustedStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">
                確定終了時間
              </label>
              <input
                type="time"
                value={adjustedEndTime}
                onChange={(e) => setAdjustedEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:opacity-90"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-wine-red text-white rounded hover:opacity-90"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* コピー用テキスト表示 */}
      {copyText && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-bold text-wine-red mb-4">
              LINE で送信するテキスト
            </h2>
            <textarea
              value={copyText}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded mb-4 font-mono text-sm"
              rows={8}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setCopyText('')}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:opacity-90"
              >
                閉じる
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(copyText);
                  alert('コピーしました！');
                  setCopyText('');
                }}
                className="flex-1 px-4 py-2 bg-gold text-wine-red rounded hover:opacity-90 font-semibold"
              >
                コピー
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
