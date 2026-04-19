/// <reference path="../pb_data/types.d.ts" />

routerAdd('POST', '/api/ch/ingest', function (c) {
  console.log('[ch/ingest] hook entered');

  try {
    var dedupeLib = require(`${__hooks}/content_hub.lib.dedupe.js`);
    var scoringLib = require(`${__hooks}/content_hub.lib.scoring.js`);
    var computeTopicKey = dedupeLib && dedupeLib.computeTopicKey;
    var computeSignalScore = scoringLib && scoringLib.computeSignalScore;

    var getHeader = function (ctx, name) {
      var target = String(name || '').toLowerCase();

      try {
        var request = ctx && ctx.request ? ctx.request : null;

        if (!request || typeof request !== 'object') {
          return '';
        }

        if (request.header && typeof request.header.get === 'function') {
          return request.header.get(name) || request.header.get(target) || '';
        }

        if (request.headers && typeof request.headers.get === 'function') {
          return request.headers.get(name) || request.headers.get(target) || '';
        }
      } catch (e) {
        return '';
      }

      return '';
    };

    var parseBearerToken = function (headerValue) {
      if (!headerValue || typeof headerValue !== 'string') {
        return '';
      }

      var parts = headerValue.trim().split(/\s+/);
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return '';
      }

      return parts[1] || '';
    };

    var timingSafeEqual = function (left, right) {
      var a = String(left || '');
      var b = String(right || '');
      var maxLen = Math.max(a.length, b.length);
      var diff = a.length ^ b.length;

      for (var i = 0; i < maxLen; i++) {
        var aCode = i < a.length ? a.charCodeAt(i) : 0;
        var bCode = i < b.length ? b.charCodeAt(i) : 0;
        diff |= aCode ^ bCode;
      }

      return diff === 0;
    };

    var normalizeDate = function (value) {
      if (!value) {
        return null;
      }

      var parsed = Date.parse(String(value));
      if (isNaN(parsed)) {
        return null;
      }

      return new Date(parsed).toISOString();
    };

    var hasOwn = function (value, key) {
      return !!value && Object.prototype.hasOwnProperty.call(value, key);
    };

    var safeNumber = function (value, fallback) {
      var parsed = Number(value);
      return isNaN(parsed) ? (fallback || 0) : parsed;
    };

    var safeInteger = function (value, fallback) {
      var parsed = parseInt(value, 10);
      return isNaN(parsed) ? (fallback || 0) : parsed;
    };

    var normalizeString = function (value) {
      if (value == null) {
        return '';
      }

      return String(value);
    };

    var normalizeStringArray = function (value) {
      if (!Array.isArray(value)) {
        return [];
      }

      var items = [];
      for (var i = 0; i < value.length; i++) {
        if (value[i] == null) {
          continue;
        }

        items.push(String(value[i]));
      }

      return items;
    };

    var normalizeObject = function (value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
      }

      var copy = {};
      for (var key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          copy[key] = value[key];
        }
      }

      return copy;
    };

    var mergeObjects = function (existingValue, incomingValue) {
      var existing = normalizeObject(existingValue);
      var incoming = normalizeObject(incomingValue);
      var merged = {};

      for (var existingKey in existing) {
        if (Object.prototype.hasOwnProperty.call(existing, existingKey)) {
          merged[existingKey] = existing[existingKey];
        }
      }

      for (var incomingKey in incoming) {
        if (Object.prototype.hasOwnProperty.call(incoming, incomingKey)) {
          merged[incomingKey] = incoming[incomingKey];
        }
      }

      return merged;
    };

    var appendResurfacedAt = function (rawPayload, timestamp) {
      var merged = mergeObjects(rawPayload, {});
      var resurfacedAt = Array.isArray(merged.resurfaced_at) ? merged.resurfaced_at.slice() : [];
      resurfacedAt.push(timestamp);
      merged.resurfaced_at = resurfacedAt;
      return merged;
    };

    var roundToTwo = function (value) {
      return Math.round(safeNumber(value, 0) * 100) / 100;
    };

    var findFirstRecord = function (collectionName, filter, params) {
      try {
        return $app.findFirstRecordByFilter(collectionName, filter, params || {});
      } catch (e) {
        return null;
      }
    };

    var saveRecord = function (record, data) {
      for (var key in data) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) {
          continue;
        }

        if (data[key] === undefined) {
          continue;
        }

        record.set(key, data[key]);
      }

      $app.save(record);
      return record;
    };

    var createRecord = function (collectionName, data) {
      var collection = $app.findCollectionByNameOrId(collectionName);
      var record = new Record(collection);
      return saveRecord(record, data || {});
    };

    var saveExistingTrendRecord = function (existingRecord, data, nowIso, newSignalCount) {
      for (var key in data) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) {
          continue;
        }

        if (data[key] === undefined) {
          continue;
        }

        existingRecord.set(key, data[key]);
      }

      console.log('[ch/ingest] saving existing trend:', existingRecord.id, 'new last_seen_at:', nowIso, 'new signal_count:', newSignalCount);

      var savedOrError = null;
      try {
        if ($app.dao && typeof $app.dao === 'function') {
          var dao = $app.dao();
          if (dao && typeof dao.saveRecord === 'function') {
            savedOrError = dao.saveRecord(existingRecord);
          } else {
            savedOrError = $app.save(existingRecord);
          }
        } else {
          savedOrError = $app.save(existingRecord);
        }

        console.log('[ch/ingest] save result for', existingRecord.id, ':', savedOrError);
      } catch (saveError) {
        savedOrError = saveError && saveError.message ? saveError.message : String(saveError || 'unknown save error');
        console.log('[ch/ingest] save result for', existingRecord.id, ':', savedOrError);
        throw saveError;
      }

      var persistedRecord = null;
      if ($app.dao && typeof $app.dao === 'function') {
        var verifyDao = $app.dao();
        if (verifyDao && typeof verifyDao.findRecordById === 'function') {
          try {
            persistedRecord = verifyDao.findRecordById('ch_trends', existingRecord.id);
          } catch (verifyDaoError) {}
        }
      }

      if (!persistedRecord) {
        persistedRecord = $app.findRecordById('ch_trends', existingRecord.id);
      }

      if (!persistedRecord) {
        throw new Error('existing trend save verification failed: record not found after save');
      }

      var persistedLastSeenAt = normalizeDate(persistedRecord.get('last_seen_at'));
      var expectedLastSeenMs = Date.parse(nowIso);
      var actualLastSeenMs = persistedLastSeenAt ? Date.parse(persistedLastSeenAt) : NaN;
      var lastSeenMatches = !isNaN(expectedLastSeenMs) && !isNaN(actualLastSeenMs) && Math.abs(actualLastSeenMs - expectedLastSeenMs) < 2000;
      var persistedSignalCount = safeInteger(persistedRecord.get('signal_count'), 0);

      if (!lastSeenMatches || persistedSignalCount !== newSignalCount) {
        throw new Error(
          'existing trend save verification failed: persisted last_seen_at=' + persistedRecord.get('last_seen_at') +
          ' persisted signal_count=' + persistedSignalCount
        );
      }

      return persistedRecord;
    };

    var isOlderThanDays = function (dateValue, nowMs, days) {
      var parsed = normalizeDate(dateValue);
      if (!parsed) {
        return false;
      }

      return Date.parse(parsed) <= (nowMs - (days * 24 * 60 * 60 * 1000));
    };

    var addUnique = function (list, value) {
      if (!value) {
        return;
      }

      if (list.indexOf(value) === -1) {
        list.push(value);
      }
    };

    var isUniqueConstraintError = function (error) {
      var message = error && typeof error.message === 'string'
        ? error.message.toLowerCase()
        : String(error || '').toLowerCase();

      return message.indexOf('unique') !== -1 ||
        message.indexOf('duplicate') !== -1 ||
        message.indexOf('constraint failed') !== -1;
    };

    var summarizeError = function (error, context) {
      return {
        message: error && error.message ? error.message : String(error || 'unknown error'),
        context: context || {},
      };
    };

    var insertSourceRecord = function (trendId, sourceInput) {
      var source = sourceInput && sourceInput.source ? String(sourceInput.source) : '';
      var externalId = sourceInput && sourceInput.external_id ? String(sourceInput.external_id) : '';

      if (!source || !externalId) {
        return;
      }

      try {
        createRecord('ch_trend_sources', {
          trend: trendId,
          source: source,
          external_id: externalId,
          url: sourceInput.url || '',
          metric_name: sourceInput.metric_name || '',
          metric_value: safeNumber(sourceInput.metric_value, 0),
          seen_at: normalizeDate(sourceInput.seen_at) || new Date().toISOString(),
        });
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          return;
        }

        throw err;
      }
    };

    var recomputeTrendAggregates = function (trendId) {
      var trendRecord = $app.findRecordById('ch_trends', trendId);
      var sourceRecords = $app.findRecordsByFilter(
        'ch_trend_sources',
        'trend = {:trendId}',
        '',
        0,
        500,
        { trendId: trendId }
      );
      var seenSources = {};
      var crossPlatformCount = 0;

      for (var i = 0; i < sourceRecords.length; i++) {
        var sourceName = sourceRecords[i].get('source');

        if (!sourceName || seenSources[sourceName]) {
          continue;
        }

        seenSources[sourceName] = true;
        crossPlatformCount += 1;
      }

      var score = computeSignalScore({
        velocity: trendRecord.get('velocity'),
        views: trendRecord.get('views'),
        cross_platform_count: crossPlatformCount,
        signal_count: trendRecord.get('signal_count'),
        last_seen_at: trendRecord.get('last_seen_at'),
      });

      saveRecord(trendRecord, {
        cross_platform_count: crossPlatformCount,
        signal_score: roundToTwo(score),
      });
    };

    if (typeof computeTopicKey !== 'function') {
      throw new Error('content_hub.lib.dedupe.js did not export computeTopicKey');
    }

    if (typeof computeSignalScore !== 'function') {
      throw new Error('content_hub.lib.scoring.js did not export computeSignalScore');
    }

    var secret = $os.getenv('CH_INGEST_SECRET') || '';
    var authHeader = getHeader(c, 'Authorization');
    var providedToken = parseBearerToken(authHeader);

    if (!secret || !providedToken || !timingSafeEqual(providedToken, secret)) {
      return c.json(401, { error: 'unauthorized' });
    }

    var info = c.requestInfo();
    var body = (info && info.body) || {};

    var runMetadata = body.run_metadata || {};

    if (!Array.isArray(body.trends)) {
      return c.json(400, { error: 'invalid payload', details: 'trends must be an array' });
    }

    if (!runMetadata.started_at) {
      return c.json(400, { error: 'invalid payload', details: 'run_metadata.started_at is required' });
    }

    var runStartedAt = normalizeDate(runMetadata.started_at);
    if (!runStartedAt) {
      return c.json(400, { error: 'invalid payload', details: 'run_metadata.started_at must be a valid ISO date' });
    }

    var trends = body.trends;
    var runRecord;

    try {
      runRecord = createRecord('ch_ingestion_runs', {
        started_at: runStartedAt,
        status: 'running',
        trends_found: trends.length,
        trends_new: 0,
        trends_updated: 0,
        errors: [],
      });
    } catch (err) {
      return c.json(500, { error: 'failed to create ingestion run', details: err.message });
    }

    var nowIso = new Date().toISOString();
    var nowMs = Date.parse(runStartedAt);
    var touchedTrendIds = [];
    var errors = [];
    var trendsNew = 0;
    var trendsUpdated = 0;
    var successfulTrendCount = 0;
    var topicRecordCache = {};
    var updatedTopicKeysThisRun = {};
    var signalCountedTopicKeys = {};

    // Design decision: same-payload duplicates increment signal_count once per payload,
    // not once per duplicate entry. Cross-platform breadth is already captured by
    // ch_trend_sources + cross_platform_count.
    try {
      for (var i = 0; i < trends.length; i++) {
        var trend = trends[i] || {};

        try {
          var topic = normalizeString(trend.topic).trim();
          var topicKey = computeTopicKey(topic);

          if (!topicKey) {
            errors.push({
              message: 'topic_key could not be computed',
              context: { topic: topic || null },
            });
            continue;
          }

          var trendRecord = topicRecordCache[topicKey] || findFirstRecord(
            'ch_trends',
            'topic_key = {:topicKey}',
            { topicKey: topicKey }
          );
          var shouldIncrementSignalCount = !signalCountedTopicKeys[topicKey];

          if (trendRecord) {
            var existing = trendRecord;
            var mergedRawPayload = mergeObjects(existing.get('raw_payload'), trend.raw_payload);
            var isResurfaced = isOlderThanDays(existing.get('last_seen_at'), nowMs, 14);

            if (isResurfaced) {
              mergedRawPayload = appendResurfacedAt(mergedRawPayload, nowIso);
            }

            var newSignalCount = safeInteger(existing.get('signal_count'), 0) + (shouldIncrementSignalCount ? 1 : 0);

            trendRecord = saveExistingTrendRecord(existing, {
              topic_key: topicKey,
              topic: topic,
              category: hasOwn(trend, 'category') ? (trend.category || null) : existing.get('category'),
              status: isResurfaced ? 'active' : (existing.get('status') || 'active'),
              last_seen_at: nowIso,
              signal_count: newSignalCount,
              velocity: Math.max(safeNumber(existing.get('velocity'), 0), safeNumber(trend.velocity, 0)),
              views: Math.max(safeNumber(existing.get('views'), 0), safeNumber(trend.views, 0)),
              suggested_title: hasOwn(trend, 'suggested_title') ? normalizeString(trend.suggested_title) : normalizeString(existing.get('suggested_title')),
              angle: hasOwn(trend, 'angle') ? normalizeString(trend.angle) : normalizeString(existing.get('angle')),
              seo_short_tail: hasOwn(trend, 'seo_short_tail') ? normalizeStringArray(trend.seo_short_tail) : normalizeStringArray(existing.get('seo_short_tail')),
              seo_long_tail: hasOwn(trend, 'seo_long_tail') ? normalizeStringArray(trend.seo_long_tail) : normalizeStringArray(existing.get('seo_long_tail')),
              geo_questions: hasOwn(trend, 'geo_questions') ? normalizeStringArray(trend.geo_questions) : normalizeStringArray(existing.get('geo_questions')),
              raw_payload: mergedRawPayload,
            }, nowIso, newSignalCount);

            if (!updatedTopicKeysThisRun[topicKey]) {
              trendsUpdated += 1;
              updatedTopicKeysThisRun[topicKey] = true;
            }
          } else {
            trendRecord = createRecord('ch_trends', {
              topic_key: topicKey,
              topic: topic,
              category: trend.category || null,
              status: 'active',
              first_seen_at: nowIso,
              last_seen_at: nowIso,
              signal_count: 1,
              velocity: safeNumber(trend.velocity, 0),
              views: safeNumber(trend.views, 0),
              cross_platform_count: 0,
              signal_score: 0,
              suggested_title: normalizeString(trend.suggested_title),
              angle: normalizeString(trend.angle),
              seo_short_tail: normalizeStringArray(trend.seo_short_tail),
              seo_long_tail: normalizeStringArray(trend.seo_long_tail),
              geo_questions: normalizeStringArray(trend.geo_questions),
              raw_payload: normalizeObject(trend.raw_payload),
            });

            trendsNew += 1;
          }

          topicRecordCache[topicKey] = trendRecord;
          if (shouldIncrementSignalCount) {
            signalCountedTopicKeys[topicKey] = true;
          }

          addUnique(touchedTrendIds, trendRecord.id);
          successfulTrendCount += 1;

          var sources = Array.isArray(trend.sources) ? trend.sources : [];
          for (var s = 0; s < sources.length; s++) {
            insertSourceRecord(trendRecord.id, sources[s]);
          }
        } catch (trendError) {
          errors.push(summarizeError(trendError, {
            topic: trend && trend.topic ? trend.topic : null,
          }));
        }
      }

      for (var t = 0; t < touchedTrendIds.length; t++) {
        try {
          recomputeTrendAggregates(touchedTrendIds[t]);
        } catch (aggregateError) {
          errors.push(summarizeError(aggregateError, {
            trend_id: touchedTrendIds[t],
          }));
        }
      }

      var status = 'success';
      if (errors.length > 0) {
        status = successfulTrendCount > 0 ? 'partial' : 'failed';
      }

      saveRecord(runRecord, {
        finished_at: new Date().toISOString(),
        status: status,
        trends_new: trendsNew,
        trends_updated: trendsUpdated,
        errors: errors,
      });

      var result = {
        success: true,
        run_id: runRecord.id,
        trends_new: trendsNew,
        trends_updated: trendsUpdated,
        errors: errors,
        status: status,
      };

      console.log('[ch/ingest] run', result.run_id, 'new=' + result.trends_new, 'updated=' + result.trends_updated);
      return c.json(200, result);
    } catch (fatalError) {
      try {
        saveRecord(runRecord, {
          finished_at: new Date().toISOString(),
          status: successfulTrendCount > 0 ? 'partial' : 'failed',
          trends_new: trendsNew,
          trends_updated: trendsUpdated,
          errors: errors.concat([summarizeError(fatalError, { stage: 'fatal' })]),
        });
      } catch (ignored) {}

      return c.json(500, {
        error: 'ingest failed',
        details: fatalError && fatalError.message ? fatalError.message : String(fatalError || 'unknown error'),
      });
    }
  } catch (err) {
    console.log('[ch/ingest] CAUGHT:', err && err.message, err && err.stack);
    return c.json(500, { error: String((err && err.message) || err) });
  }
});
