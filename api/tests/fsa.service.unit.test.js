import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeString,
  normalizePostcode,
  findBestMatch,
  parseRatingValue,
  generateBadgeUrl
} from '../services/fsa.service.js';

test.describe('FSA Service - Normalization Functions', () => {
  test('normalizeString should lowercase and trim input', () => {
    assert.equal(normalizeString('  Hello World  '), 'hello world');
  });

  test('normalizeString should collapse multiple spaces', () => {
    assert.equal(normalizeString('Hello    World'), 'hello world');
  });

  test('normalizeString should remove special characters', () => {
    assert.equal(normalizeString('Hello! @#$% World'), 'hello  world');
  });

  test('normalizeString should handle null/undefined', () => {
    assert.equal(normalizeString(null), '');
    assert.equal(normalizeString(undefined), '');
    assert.equal(normalizeString(''), '');
  });

  test('normalizePostcode should uppercase and trim', () => {
    assert.equal(normalizePostcode('sw1a 1aa'), 'SW1A 1AA');
    assert.equal(normalizePostcode('  e1 6bl  '), 'E1 6BL');
  });

  test('normalizePostcode should handle null/undefined', () => {
    assert.equal(normalizePostcode(null), '');
    assert.equal(normalizePostcode(undefined), '');
  });
});

test.describe('FSA Service - Rating Value Parsing', () => {
  test('parseRatingValue should return numeric ratings as strings', () => {
    assert.equal(parseRatingValue('5'), '5');
    assert.equal(parseRatingValue('3'), '3');
    assert.equal(parseRatingValue('0'), '0');
  });

  test('parseRatingValue should handle Exempt ratings', () => {
    assert.equal(parseRatingValue('Exempt'), 'Exempt');
    assert.equal(parseRatingValue('Exempt - Awaiting Publication'), 'Exempt');
  });

  test('parseRatingValue should handle edge cases correctly', () => {
    assert.equal(parseRatingValue(null), null);
    assert.equal(parseRatingValue(undefined), null);
    assert.equal(parseRatingValue('6'), null);
    assert.equal(parseRatingValue('-1'), null);
    assert.equal(parseRatingValue('abc'), null);
    assert.equal(parseRatingValue(''), null);
  });
});

test.describe('FSA Service - Badge URL Generation', () => {
  test('generateBadgeUrl should generate correct URLs for ratings 0-5', () => {
    assert.equal(
      generateBadgeUrl('5'),
      'https://ratings.food.gov.uk/images/badges/fhrs/3/fhrs-badge-5.svg'
    );
    assert.equal(
      generateBadgeUrl('0'),
      'https://ratings.food.gov.uk/images/badges/fhrs/3/fhrs-badge-0.svg'
    );
  });

  test('generateBadgeUrl should return null for Exempt', () => {
    assert.equal(generateBadgeUrl('Exempt'), null);
  });

  test('generateBadgeUrl should return null for null/undefined', () => {
    assert.equal(generateBadgeUrl(null), null);
    assert.equal(generateBadgeUrl(undefined), null);
  });
});

test.describe('FSA Service - Find Best Match', () => {
  const establishments = [
    {
      BusinessName: 'Pizza Palace',
      PostCode: 'SW1A 1AA',
      FHRSID: 123456,
      RatingValue: '5'
    },
    {
      BusinessName: 'Pizza Express',
      PostCode: 'SW1A 1AA',
      FHRSID: 654321,
      RatingValue: '4'
    },
    {
      BusinessName: 'Chinese Takeaway',
      PostCode: 'E1 6BL',
      FHRSID: 111111,
      RatingValue: '3'
    }
  ];

  test('findBestMatch should return null for empty establishments', () => {
    const result = findBestMatch([], 'Test Restaurant', 'SW1A 1AA');
    assert.equal(result.match, null);
    assert.equal(result.score, 0);
    assert.equal(result.multipleMatches, false);
  });

  test('findBestMatch should return null for null establishments', () => {
    const result = findBestMatch(null, 'Test Restaurant', 'SW1A 1AA');
    assert.equal(result.match, null);
  });

  test('findBestMatch should find exact name match', () => {
    const result = findBestMatch(establishments, 'Pizza Palace', 'SW1A 1AA');
    assert.equal(result.match?.FHRSID, 123456);
    assert.ok(result.score >= 0.7);
  });

  test('findBestMatch should prioritize postcode match', () => {
    const result = findBestMatch(establishments, 'Pizza', 'SW1A 1AA');
    assert.equal(result.match?.PostCode, 'SW1A 1AA');
  });

  test('findBestMatch should detect multiple matches', () => {
    const result = findBestMatch(establishments, 'Pizza', null);
    assert.ok(result.multipleMatches || result.score >= 0.8);
  });

  test('findBestMatch should handle partial name matches', () => {
    const result = findBestMatch(establishments, 'Pizza Palace', null);
    assert.notEqual(result.match, null);
    assert.ok(result.score > 0);
  });

  test('findBestMatch should handle establishments without postcodes', () => {
    const estWithoutPostcode = [{ BusinessName: 'Test Restaurant', PostCode: null }];
    const result = findBestMatch(estWithoutPostcode, 'Test Restaurant', 'SW1A 1AA');
    assert.notEqual(result.match, null);
  });
});
