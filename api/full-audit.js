function addSEOEvaluations(data, keyword) {
  const evaluations = {};

  // Debug log to see what data we're getting
  console.log('Worker data keys:', Object.keys(data));
  console.log('Metadata:', data.metadata);
  console.log('HeadingStats:', data.headingStats);

  // Title evaluation
  if (data.metadata?.title) {
    const title = data.metadata.title;
    const hasKeyword = keyword && title.toLowerCase().includes(keyword.toLowerCase());
    const length = title.length;
    let status = '✅';
    
    if (length < 30) {
      status = '⚠️';
    } else if (length > 60) {
      status = '⚠️';
    } else if (!hasKeyword && keyword) {
      status = '❌';
    }
    
    evaluations.title = {
      value: title,
      length: `${length} characters`,
      hasKeyword: hasKeyword,
      status: status
    };
  } else {
    evaluations.title = {
      value: 'Not found',
      status: '❌'
    };
  }

  // Meta description evaluation
  if (data.metadata?.description) {
    const desc = data.metadata.description;
    const hasKeyword = keyword && desc.toLowerCase().includes(keyword.toLowerCase());
    const length = desc.length;
    let status = '✅';
    
    if (length < 120) {
      status = '⚠️';
    } else if (length > 160) {
      status = '⚠️';
    } else if (!hasKeyword && keyword) {
      status = '⚠️';
    }
    
    evaluations.metaDescription = {
      value: desc,
      length: `${length} characters`,
      hasKeyword: hasKeyword,
      status: status
    };
  } else {
    evaluations.metaDescription = {
      value: 'Not found',
      status: '❌'
    };
  }

  // H1 evaluation
  const h1Count = data.headingStats?.h1 || 0;
  let h1Status = '✅';
  if (h1Count === 0) {
    h1Status = '❌';
  } else if (h1Count > 1) {
    h1Status = '⚠️';
  }
  
  evaluations.h1 = {
    value: `${h1Count} H1 tag${h1Count !== 1 ? 's' : ''} found`,
    count: h1Count,
    status: h1Status
  };

  // Images evaluation
  const imageStats = data.imageAltStats;
  if (imageStats) {
    const missingAlt = imageStats.imagesMissingAlt || 0;
    const total = imageStats.totalImages || 0;
    let imageStatus = '✅';
    
    if (total > 0 && missingAlt > 0) {
      imageStatus = '⚠️';
    }
    
    evaluations.images = {
      value: `${total} images, ${missingAlt} missing alt text`,
      total: total,
      missingAlt: missingAlt,
      status: imageStatus
    };
  }

  // Keyword frequency evaluation
  if (keyword && data.keywordFrequency !== undefined) {
    const freq = data.keywordFrequency;
    const wordCount = data.wordCount || 1;
    const density = ((freq / wordCount) * 100).toFixed(2);
    
    let status = '✅';
    
    if (freq === 0) {
      status = '❌';
    } else if (data.keywordStuffing) {
      status = '❌';
    } else if (parseFloat(density) < 0.5) {
      status = '⚠️';
    }
    
    evaluations.keywordUsage = {
      value: `"${keyword}" appears ${freq} times (${density}% density)`,
      frequency: freq,
      density: density + '%',
      status: status
    };
  }

  // Internal links evaluation
  const linkStats = data.linkStats;
  if (linkStats) {
    const internal = linkStats.internalLinks || 0;
    const external = linkStats.externalLinks || 0;
    const total = linkStats.totalLinks || 0;
    
    let linkStatus = '✅';
    if (internal === 0) {
      linkStatus = '❌';
    } else if (internal < 3) {
      linkStatus = '⚠️';
    }
    
    evaluations.internalLinks = {
      value: `${total} total links (${internal} internal, ${external} external)`,
      internal: internal,
      external: external,
      total: total,
      status: linkStatus
    };
  }

  // Canonical URL evaluation
  if (data.metadata?.canonical) {
    evaluations.canonical = {
      value: data.metadata.canonical,
      status: '✅'
    };
  } else {
    evaluations.canonical = {
      value: 'Not found',
      status: '❌'
    };
  }

  // Robots meta evaluation
  if (data.metadata?.robots) {
    const robots = data.metadata.robots;
    let robotsStatus = '✅';
    
    if (robots.includes('noindex')) {
      robotsStatus = '⚠️';
    }
    
    evaluations.robots = {
      value: robots,
      status: robotsStatus
    };
  } else {
    evaluations.robots = {
      value: 'Not found (default: index, follow)',
      status: '✅'
    };
  }

  // Open Graph evaluation
  const ogTags = data.socialTags?.openGraph || {};
  const ogCount = Object.keys(ogTags).length;
  
  evaluations.openGraph = {
    value: ogCount > 0 ? `${ogCount} Open Graph tags found` : 'No Open Graph tags found',
    tags: ogTags,
    status: ogCount > 0 ? '✅' : '❌'
  };

  // Structured data evaluation
  const structuredData = data.structuredData || {};
  const schemaCount = structuredData.jsonLdScripts?.length || 0;
  
  evaluations.structuredData = {
    value: schemaCount > 0 ? `${schemaCount} JSON-LD scripts found` : 'No structured data found',
    count: schemaCount,
    types: structuredData.schemaTypes || [],
    status: schemaCount > 0 ? '✅' : '❌'
  };

  // Add evaluations to the original data
  return {
    ...data,
    seoEvaluations: evaluations
  };
}

export default async function handler(req, res) {
  const url = req.query.url;
  const keyword = req.query.keyword || "";
  const userAgent = req.query['user-agent'] || 'chrome';

  if (!url) {
    return res.status(400).json({ error: "Missing required query parameter: url" });
  }

  try {
    // Call comprehensive Cloudflare Worker
    const workerUrl = `https://seo-audit.itsjaskrn.workers.dev/?url=${encodeURIComponent(url)}`;
    const finalUrl = keyword ? `${workerUrl}&keyword=${encodeURIComponent(keyword)}` : workerUrl;
    const userAgentUrl = `${finalUrl}&user-agent=${userAgent}`;
    
    const workerResponse = await fetch(userAgentUrl);
    const workerData = await workerResponse.json();

    if (workerData.error) {
      return res.status(502).json({
        error: "Worker fetch failed",
        details: workerData.error
      });
    }

    // If no keyword provided, return suggested keywords without evaluations
    if (!keyword && workerData.suggestedKeywords) {
      return res.status(200).json(workerData);
    }

    // Add SEO evaluations to the worker data
    const evaluatedData = addSEOEvaluations(workerData, keyword);
    return res.status(200).json(evaluatedData);

  } catch (err) {
    console.error("Full audit failed:", err);
    return res.status(500).json({
      error: "SEO audit failed",
      details: err.message
    });
  }
}
