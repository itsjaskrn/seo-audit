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
    let feedback = 'Good';
    
    if (length < 30) {
      status = '⚠️';
      feedback = 'Too short (recommended: 30-60 characters)';
    } else if (length > 60) {
      status = '⚠️';
      feedback = 'Too long (recommended: 30-60 characters)';
    } else if (!hasKeyword && keyword) {
      status = '❌';
      feedback = 'Missing focus keyword';
    }
    
    evaluations.title = {
      content: title,
      length: length,
      hasKeyword: hasKeyword,
      status: status,
      feedback: feedback
    };
  } else {
    evaluations.title = {
      content: null,
      status: '❌',
      feedback: 'Missing title tag'
    };
  }

  // Meta description evaluation
  if (data.metadata?.description) {
    const desc = data.metadata.description;
    const hasKeyword = keyword && desc.toLowerCase().includes(keyword.toLowerCase());
    const length = desc.length;
    let status = '✅';
    let feedback = 'Good';
    
    if (length < 120) {
      status = '⚠️';
      feedback = 'Too short (recommended: 120-160 characters)';
    } else if (length > 160) {
      status = '⚠️';
      feedback = 'Too long (recommended: 120-160 characters)';
    } else if (!hasKeyword && keyword) {
      status = '⚠️';
      feedback = 'Consider adding focus keyword';
    }
    
    evaluations.metaDescription = {
      content: desc,
      length: length,
      hasKeyword: hasKeyword,
      status: status,
      feedback: feedback
    };
  } else {
    evaluations.metaDescription = {
      content: null,
      status: '❌',
      feedback: 'Missing meta description'
    };
  }

  // H1 evaluation
  const h1Count = data.headingStats?.h1 || 0;
  if (h1Count === 1) {
    evaluations.h1 = {
      count: h1Count,
      status: '✅',
      feedback: 'Perfect - one H1 tag found'
    };
  } else if (h1Count === 0) {
    evaluations.h1 = {
      count: h1Count,
      status: '❌',
      feedback: 'Missing H1 tag'
    };
  } else {
    evaluations.h1 = {
      count: h1Count,
      status: '⚠️',
      feedback: `Multiple H1 tags found (${h1Count}) - should be only one`
    };
  }

  // Images evaluation
  const imageStats = data.imageAltStats;
  if (imageStats) {
    const missingAlt = imageStats.imagesMissingAlt || 0;
    const total = imageStats.totalImages || 0;
    
    if (total === 0) {
      evaluations.images = {
        total: 0,
        missingAlt: 0,
        status: '✅',
        feedback: 'No images found'
      };
    } else if (missingAlt === 0) {
      evaluations.images = {
        total: total,
        missingAlt: 0,
        status: '✅',
        feedback: 'All images have alt text'
      };
    } else {
      evaluations.images = {
        total: total,
        missingAlt: missingAlt,
        status: '⚠️',
        feedback: `${missingAlt} out of ${total} images missing alt text`
      };
    }
  }

  // Keyword frequency evaluation
  if (keyword && data.keywordFrequency !== undefined) {
    const freq = data.keywordFrequency;
    const wordCount = data.wordCount || 1;
    const density = ((freq / wordCount) * 100).toFixed(2);
    
    let status = '✅';
    let feedback = 'Good keyword density';
    
    if (freq === 0) {
      status = '❌';
      feedback = 'Keyword not found in content';
    } else if (data.keywordStuffing) {
      status = '❌';
      feedback = `Keyword stuffing detected (${freq} times, ${density}% density)`;
    } else if (parseFloat(density) < 0.5) {
      status = '⚠️';
      feedback = `Low keyword density (${density}% - consider 0.5-2%)`;
    }
    
    evaluations.keywordUsage = {
      frequency: freq,
      density: density + '%',
      status: status,
      feedback: feedback
    };
  }

  // Internal links evaluation
  const linkStats = data.linkStats;
  if (linkStats) {
    const internal = linkStats.internalLinks || 0;
    
    if (internal === 0) {
      evaluations.internalLinks = {
        count: 0,
        status: '❌',
        feedback: 'No internal links found - add some for better SEO'
      };
    } else if (internal < 3) {
      evaluations.internalLinks = {
        count: internal,
        status: '⚠️',
        feedback: `Only ${internal} internal links - consider adding more`
      };
    } else {
      evaluations.internalLinks = {
        count: internal,
        status: '✅',
        feedback: 'Good internal linking'
      };
    }
  }

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
