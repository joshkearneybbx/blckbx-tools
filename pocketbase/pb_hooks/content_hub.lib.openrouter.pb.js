/// <reference path="../pb_data/types.d.ts" />

var contentHubGetOpenRouterModel =
  typeof contentHubGetOpenRouterModel === "function"
    ? contentHubGetOpenRouterModel
    : function (requestedModel) {
        return requestedModel || $os.getenv("OPENROUTER_MODEL") || "google/gemini-2.5-pro";
      };

var contentHubGetOpenRouterImageModel =
  typeof contentHubGetOpenRouterImageModel === "function"
    ? contentHubGetOpenRouterImageModel
    : function (requestedModel) {
        return requestedModel || $os.getenv("OPENROUTER_IMAGE_MODEL") || "google/gemini-2.5-flash-image-preview";
      };

var contentHubOpenRouterChat =
  typeof contentHubOpenRouterChat === "function"
    ? contentHubOpenRouterChat
    : function (options) {
        var apiKey = $os.getenv("OPENROUTER_API_KEY");
        if (!apiKey) {
          throw new Error("OPENROUTER_API_KEY is not configured");
        }

        var payload = {
          model: contentHubGetOpenRouterModel(options && options.model),
          messages: (options && options.messages) || [],
        };

        if (options && options.temperature != null) {
          payload.temperature = options.temperature;
        }

        if (options && options.response_format) {
          payload.response_format = options.response_format;
        }

        var response = $http.send({
          url: "https://openrouter.ai/api/v1/chat/completions",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + apiKey,
          },
          body: JSON.stringify(payload),
          timeout: options && options.timeout ? options.timeout : 120,
        });

        if (!response || response.statusCode < 200 || response.statusCode >= 300) {
          throw new Error("OpenRouter request failed with status " + (response ? response.statusCode : "unknown"));
        }

        return response.json;
      };
