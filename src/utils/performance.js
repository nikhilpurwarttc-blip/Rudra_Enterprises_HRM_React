import { useLayoutEffect } from 'react';

const latestApiResponses = new Map();
const loggedApiResponses = new Map();

export const recordApiResponse = (endpointName, responseReceivedAt) => {
  latestApiResponses.set(endpointName, responseReceivedAt);
};

const getLatestApiResponse = (endpointName) => latestApiResponses.get(endpointName);

export const useRenderPerformance = (endpointName, data, enabled = true) => {
  useLayoutEffect(() => {
    if (!enabled || data == null) return;

    const responseReceivedAt = getLatestApiResponse(endpointName);
    if (responseReceivedAt == null) return;
    if (loggedApiResponses.get(endpointName) === responseReceivedAt) return;
    loggedApiResponses.set(endpointName, responseReceivedAt);

    const committedAt = performance.now();
    console.groupCollapsed(`[UI] ${endpointName} data render`);
    console.log(JSON.stringify({
      endpoint: endpointName,
      responseToCommitMs: Number((committedAt - responseReceivedAt).toFixed(2)),
      responseReceivedAt,
      committedAt,
    }));
    console.groupEnd();
  }, [data, enabled, endpointName]);
};