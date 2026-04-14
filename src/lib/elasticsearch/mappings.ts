export const sharedIndexSettings: Record<string, unknown> = {
  number_of_shards: 1,
  number_of_replicas: 0,
  analysis: {
    analyzer: {
      autocomplete_analyzer: {
        type: "custom",
        tokenizer: "autocomplete_tokenizer",
        filter: ["lowercase", "asciifolding"],
      },
      autocomplete_search: {
        type: "custom",
        tokenizer: "standard",
        filter: ["lowercase", "asciifolding"],
      },
    },
    tokenizer: {
      autocomplete_tokenizer: {
        type: "edge_ngram",
        min_gram: 1,
        max_gram: 20,
        token_chars: ["letter", "digit"],
      },
    },
  },
};

export const servicesMappings: Record<string, unknown> = {
  properties: {
    id: { type: "keyword" },
    title: {
      type: "text",
      analyzer: "standard",
      fields: {
        autocomplete: {
          type: "text",
          analyzer: "autocomplete_analyzer",
          search_analyzer: "autocomplete_search",
        },
        keyword: { type: "keyword" },
      },
    },
    shortDescription: {
      type: "text",
      analyzer: "standard",
      fields: {
        autocomplete: {
          type: "text",
          analyzer: "autocomplete_analyzer",
          search_analyzer: "autocomplete_search",
        },
      },
    },
    canDo: { type: "text", analyzer: "standard" },
    categories: { type: "keyword" },
    status: { type: "keyword" },
    requestMode: { type: "keyword" },
    basePrice: { type: "float" },
    avgRating: { type: "float" },
    reviewCount: { type: "integer" },
    slotsAvailable: { type: "integer" },
    userId: { type: "integer" },
    username: {
      type: "text",
      fields: {
        autocomplete: {
          type: "text",
          analyzer: "autocomplete_analyzer",
          search_analyzer: "autocomplete_search",
        },
        keyword: { type: "keyword" },
      },
    },
    artistName: {
      type: "text",
      fields: {
        autocomplete: {
          type: "text",
          analyzer: "autocomplete_analyzer",
          search_analyzer: "autocomplete_search",
        },
      },
    },
    slug: { type: "keyword" },
    coverImageUrl: { type: "keyword", index: false },
    updatedAt: { type: "date" },
    createdAt: { type: "date" },
  },
};

export const showcasesMappings: Record<string, unknown> = {
  properties: {
    id: { type: "keyword" },
    title: {
      type: "text",
      analyzer: "standard",
      fields: {
        autocomplete: {
          type: "text",
          analyzer: "autocomplete_analyzer",
          search_analyzer: "autocomplete_search",
        },
      },
    },
    tags: { type: "keyword" },
    likeCount: { type: "integer" },
    viewCount: { type: "integer" },
    ownerId: { type: "integer" },
    showcaseId: { type: "keyword" },
    username: {
      type: "text",
      fields: {
        autocomplete: {
          type: "text",
          analyzer: "autocomplete_analyzer",
          search_analyzer: "autocomplete_search",
        },
        keyword: { type: "keyword" },
      },
    },
    isDraft: { type: "boolean" },
    containsMatureContent: { type: "boolean" },
    createdAt: { type: "date" },
  },
};

export const profilesMappings: Record<string, unknown> = {
  properties: {
    id: { type: "keyword" },
    username: {
      type: "text",
      analyzer: "standard",
      fields: {
        autocomplete: {
          type: "text",
          analyzer: "autocomplete_analyzer",
          search_analyzer: "autocomplete_search",
        },
        keyword: { type: "keyword" },
      },
    },
    name: {
      type: "text",
      analyzer: "standard",
      fields: {
        autocomplete: {
          type: "text",
          analyzer: "autocomplete_analyzer",
          search_analyzer: "autocomplete_search",
        },
      },
    },
    bio: { type: "text", analyzer: "standard" },
    avatar: { type: "keyword", index: false },
    followerCount: { type: "integer" },
    followingCount: { type: "integer" },
    serviceCount: { type: "integer" },
    showcaseCount: { type: "integer" },
    isArtist: { type: "boolean" },
    country: { type: "keyword" },
    createdAt: { type: "date" },
  },
};
