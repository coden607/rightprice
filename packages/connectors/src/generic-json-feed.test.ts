import assert from "node:assert/strict";
import test from "node:test";
import { parseDelimitedFeed, parseFeedText } from "./generic-json-feed.ts";

test("parses quoted CSV affiliate feeds", () => {
  const rows = parseDelimitedFeed(
    'id,title,price,url\n1,"Widget, Deluxe",12.34,https://example.com/1\n',
    ","
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.title, "Widget, Deluxe");
  assert.equal(rows[0]?.price, "12.34");
});

test("parses TSV affiliate feeds", () => {
  const rows = parseFeedText(
    "id\ttitle\tprice\turl\n1\tWidget\t9.99\thttps://example.com/1\n",
    "tsv"
  );
  assert.equal(rows[0]?.title, "Widget");
});

test("parses JSONL affiliate feeds", () => {
  const rows = parseFeedText(
    '{"id":"1","title":"One"}\n{"id":"2","title":"Two"}\n',
    "jsonl"
  );
  assert.deepEqual(rows.map((row) => row.id), ["1", "2"]);
});

test("auto-detects CSV feeds", () => {
  const rows = parseFeedText(
    "id,title,price,url\n1,Widget,9.99,https://example.com/1\n",
    "auto",
    "/feed.csv"
  );
  assert.equal(rows[0]?.id, "1");
});
