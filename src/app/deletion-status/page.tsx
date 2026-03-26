'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircleIcon, ClockIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

type DeletionStatus = {
  confirmation_code: string;
  status: string;
  processed_at: string;
};

function DeletionStatusContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [data, setData]     = useState<DeletionStatus | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setError('No confirmation code provided.');
      setLoading(false);
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') ?? '';
    fetch(`${apiBase}/api/facebook/data-deletion/status/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Deletion request not found.');
        return res.json() as Promise<DeletionStatus>;
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to retrieve deletion status.');
        setLoading(false);
      });
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center text-center gap-4">
          {loading && (
            <>
              <ClockIcon className="w-14 h-14 text-gray-400 animate-pulse" />
              <h1 className="text-2xl font-semibold text-gray-800">Checking Status…</h1>
              <p className="text-gray-500 text-sm">Please wait while we retrieve your request.</p>
            </>
          )}

          {!loading && error && (
            <>
              <ExclamationCircleIcon className="w-14 h-14 text-red-400" />
              <h1 className="text-2xl font-semibold text-gray-800">Request Not Found</h1>
              <p className="text-gray-500 text-sm">{error}</p>
              <p className="text-gray-400 text-xs mt-2">
                If you believe this is an error, please contact our support team.
              </p>
            </>
          )}

          {!loading && data && (
            <>
              <CheckCircleIcon className="w-14 h-14 text-green-500" />
              <h1 className="text-2xl font-semibold text-gray-800">Data Deletion Completed</h1>
              <p className="text-gray-600 text-sm">
                Your Facebook data has been deleted from our systems in accordance with your
                request.
              </p>

              <div className="w-full bg-gray-50 rounded-xl p-4 mt-2 text-left text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="font-medium text-green-600 capitalize">{data.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Confirmation Code</span>
                  <span className="font-mono text-xs text-gray-700 break-all text-right max-w-[60%]">
                    {data.confirmation_code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Processed At</span>
                  <span className="text-gray-700">
                    {new Date(data.processed_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-gray-400 text-xs mt-2">
                The following data was removed: connected Facebook Pages and Instagram accounts
                linked to your Facebook user ID.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DeletionStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <ClockIcon className="w-10 h-10 text-gray-400 animate-pulse" />
        </div>
      }
    >
      <DeletionStatusContent />
    </Suspense>
  );
}
