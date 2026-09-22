import test from "node:test";
import assert from "node:assert/strict";
import { parseCommonsPhoto, type CommonsPage } from "./photos";

const page: CommonsPage = { pageid: 1, title: "File:Forest_trail.jpg", imageinfo: [{ url: "https://upload.wikimedia.org/trail.jpg", mime: "image/jpeg", extmetadata: { Artist: { value: '<a href="https://example.com">Photographer &amp; guide</a>' }, LicenseShortName: { value: "CC BY-SA 4.0" }, LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0/" } } }] };
test("photos retain attribution, license, actual distance and a safe source link", () => {
  const photo = parseCommonsPhoto(page, 124);
  assert.equal(photo?.artist, "Photographer & guide");
  assert.equal(photo?.title, "Forest trail");
  assert.equal(photo?.distanceMeters, 124);
  assert.equal(photo?.license, "CC BY-SA 4.0");
  const thumbnail = parseCommonsPhoto({ ...page, imageinfo: [{ ...page.imageinfo![0], thumburl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/trail.jpg" }] }, 124);
  assert.equal(thumbnail?.url, "https://thumb.wikimedia.org/wikipedia/commons/thumb/trail.jpg");
});
test("unknown licenses, missing authors, unsafe links and non-photo media are excluded", () => {
  const info = page.imageinfo![0];
  for (const patch of [{ url: "javascript:alert(1)" }, { url: "https://evil.example/photo.jpg" }, { mime: "image/svg+xml" }, { extmetadata: { ...info.extmetadata, LicenseShortName: { value: "All rights reserved" } } }, { extmetadata: { ...info.extmetadata, Artist: { value: "" } } }]) {
    assert.equal(parseCommonsPhoto({ ...page, imageinfo: [{ ...info, ...patch }] }, 100), null);
  }
  assert.equal(parseCommonsPhoto(page, NaN), null);
});
