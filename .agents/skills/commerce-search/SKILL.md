# commerce-search

1. Parse the user request into explicit constraints.
2. Query all enabled authorized connectors concurrently.
3. Normalize source offers before comparison.
4. Exclude expired/stale offers when freshness guarantees require it.
5. Rank using shopper weights only.
6. Return partial results if a connector fails and identify the missing source.
7. Explain the top result using measurable factors.
