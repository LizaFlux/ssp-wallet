// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck test suite
import chai from 'chai';
import { getFingerprint } from '../../src/lib/fingerprint';
import { describe, it } from 'mocha';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
const MockBrowser = require('mock-browser').mocks.MockBrowser;

const { assert } = chai;

describe('Fingerprint Lib', function () {
  describe('Verifies fingerprint', function () {
    before(function () {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      const mock = new MockBrowser();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      global.window = mock.getWindow();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      global.document = mock.getDocument();
    });

    // Testing using stub data
    it('should return successful result if value is valid', function () {
      const res = getFingerprint();
      assert.equal(
        res,
        `d9ce9e4a4c6c3ae9d4fa04e840cb536d2b64f2cd8740614a9e4ce323ac6a2d82`,
      );
    });
  });
});
