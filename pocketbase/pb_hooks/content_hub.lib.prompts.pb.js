/// <reference path="../pb_data/types.d.ts" />

function contentHubPromptTrendSummary(trends) {
  var items = Array.isArray(trends) ? trends : [];
  var lines = [];

  for (var i = 0; i < items.length; i++) {
    var trend = items[i] || {};
    lines.push(
      [
        "- Topic: " + (trend.topic || "Untitled trend"),
        trend.category ? "Category: " + trend.category : null,
        trend.angle ? "Angle: " + trend.angle : null,
        trend.suggested_title ? "Suggested title: " + trend.suggested_title : null,
      ].filter(Boolean).join(" | ")
    );
  }

  return lines.join("\n");
}

var contentHubBuildNewsletterPrompt =
  typeof contentHubBuildNewsletterPrompt === "function"
    ? contentHubBuildNewsletterPrompt
    : function (options) {
        var trends = options && options.trends ? options.trends : [];
        var styleGuide = options && options.styleGuide ? options.styleGuide : {};

        return {
          system:
            "You are writing a polished internal newsletter draft for BlckBx. Follow the supplied style guide and keep the output structured and editorial.",
          user:
            [
              "Style guide:",
              JSON.stringify(styleGuide, null, 2),
              "",
              "Trends:",
              contentHubPromptTrendSummary(trends),
              "",
              "Return JSON with intro, sections, outro, and meta_description.",
            ].join("\n"),
        };
      };

var contentHubBuildInstagramPrompt =
  typeof contentHubBuildInstagramPrompt === "function"
    ? contentHubBuildInstagramPrompt
    : function (options) {
        var trend = options && options.trend ? options.trend : {};
        var styleGuide = options && options.styleGuide ? options.styleGuide : {};

        return {
          system:
            "You are writing an on-brand Instagram caption for BlckBx. Keep it concise, stylish, and conversion-aware.",
          user:
            [
              "Style guide:",
              JSON.stringify(styleGuide, null, 2),
              "",
              "Trend:",
              contentHubPromptTrendSummary([trend]),
              "",
              "Return JSON with caption, hashtags, image_prompt, and image_overlay_text.",
            ].join("\n"),
        };
      };

var contentHubBuildImagePrompt =
  typeof contentHubBuildImagePrompt === "function"
    ? contentHubBuildImagePrompt
    : function (options) {
        var trend = options && options.trend ? options.trend : {};
        var template = options && options.template ? options.template : {};

        return [
          "Create an editorial luxury social image for BlckBx.",
          trend.topic ? "Topic: " + trend.topic : null,
          trend.angle ? "Angle: " + trend.angle : null,
          template.name ? "Template: " + template.name : null,
          "Output should leave clean composition space for brand overlays and text.",
        ].filter(Boolean).join("\n");
      };
