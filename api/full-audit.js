import fetchPage from '../utils/fetchPage.js';
import parseHtml from '../utils/parseHtml.js';
import detectIntent from '../utils/detectIntent.js';
import extractSections from '../utils/extractSections.js';

function addSEOEvaluations(data, keyword) {
  const evaluations = {};

  // Title evaluation
  if (data.metadata?.raw?.title) {
    const title = data.metadata.raw.title;
    const length = title.length;
    const hasKeyword = keyword && title.toLowerCase().includes(keyword.toLowerCase());
    let status = '✅';
    
    if (length < 30 || length > 60) status = '⚠️';
    if (!hasKeyword && keyword) status = '❌';
    
    evaluations.title = {
      value: title,
      length: `${length} characters`,
      hasKeyword,
      status
    };
  } else {
    evaluations.title = { value: 'Missing', status: '❌' };
  }

  // Meta description evaluation
  if (data.metadata?.raw?.description) {
    const desc = data.metadata.raw.description;
    const length = desc.length;
    const hasKeyword = keyword && desc.toLowerCase().includes(keyword.toLowerCase());
    let status = '✅';
    
    if (length < 120 || length > 160) status = '⚠️';
    if (!hasKeyword && keyword) status = '⚠️';
    
    evaluations.metaDescription = {
      value: desc,
      length: `${length} characters`,
      hasKeyword,
      status
    };
  } else {
    evaluations.metaDescription = { value: 'Missing', status: '❌' };
  }

  // H1 evaluation
  const h1Count = data.content?.summary?.h1Count || 0;
  let h1Status = h1Count === 1 ? '✅' : h1Count === 0 ? '❌' : '⚠️';
  
  evaluations.h1 = {
    value: `${h1Count} H1 tag${h1Count !== 1 ? 's' : ''} found`,
    count: h1Count,
    status: h1Status
  };

  // Images evaluation
  const imageStats = data.images?.summary;
  if (imageStats) {
    const { total, missingAlt } = imageStats;
    let imageStatus = total > 0 && missingAlt === 0 ? '✅' : '⚠️';
    
    evaluations.images = {
      value: `${total} images, ${missingAlt} missing alt text`,
      total,
      missingAlt,
      status: imageStatus
    };
  }

  // Keyword evaluation
  if (keyword && data.content?.raw?.keywordData) {
    const kd = data.content.raw.keywordData;
    let status = '✅';
    
    if (kd.count === 0) status = '❌';
    else if (parseFloat(kd.density) > 5) status = '❌';
    else if (parseFloat(kd.density) < 0.5) status = '⚠️';
    
    evaluations.keywordUsage = {
      value: `"${keyword}" appears ${kd.count} times (${kd.density}% density)`,
      frequency: kd.count,
      density: kd.density + '%',
      status
    };
  } else if (!keyword) {
    evaluations.keywordUsage = {
      value: 'No target keyword provided for analysis',
      status: '⚠️',
      suggestion: 'Add a target keyword to analyze keyword optimization'
    };
  }

  // Links evaluation
  const linkStats = data.links?.summary;
  if (linkStats) {
    const { internal, external, total } = linkStats;
    let linkStatus = internal >= 3 ? '✅' : internal === 0 ? '❌' : '⚠️';
    
    evaluations.internalLinks = {
      value: `${total} total links (${internal} internal, ${external} external)`,
      internal,
      external,
      total,
      status: linkStatus
    };
  }

  // Canonical evaluation
  evaluations.canonical = {
    value: data.metadata?.raw?.canonical || 'Missing',
    status: data.metadata?.raw?.canonical ? '✅' : '❌'
  };

  // Robots evaluation
  const robots = data.metadata?.raw?.robots;
  evaluations.robots = {
    value: robots || 'index, follow (default)',
    status: robots?.includes('noindex') ? '⚠️' : '✅'
  };

  // Open Graph evaluation
  const ogSummary = data.openGraph?.summary;
  const ogCount = ogSummary ? Object.values(ogSummary).filter(v => v === 'Present').length : 0;
  
  evaluations.openGraph = {
    value: ogCount > 0 ? `${ogCount} Open Graph tags found` : 'No Open Graph tags found',
    tags: data.openGraph?.raw || {},
    status: ogCount > 0 ? '✅' : '❌'
  };

  // Structured data evaluation
  const structuredSummary = data.structuredData?.summary;
  const schemaCount = structuredSummary?.jsonLdCount || 0;
  
  evaluations.structuredData = {
    value: schemaCount > 0 ? `${schemaCount} JSON-LD scripts found` : 'No structured data found',
    count: schemaCount,
    types: structuredSummary?.types || [],
    status: schemaCount > 0 ? '✅' : '❌'
  };

  return { ...data, seoEvaluations: evaluations };
}

export default async function handler(req, res) {
  const url = req.query.url;
  const keyword = req.query.keyword || "";
  const userAgent = req.query['user-agent'] || 'chrome';

  if (!url) {
    return res.status(400).json({ error: "Missing required query parameter: url" });
  }

  try {
    // Fetch page content
    const { html, finalUrl, redirects } = await fetchPage(url, userAgent);
    
    // Parse HTML for comprehensive SEO data
    const parsedData = await parseHtml(html, keyword, finalUrl);
    
    // Detect content intent
    const intent = detectIntent(html);
    
    // Extract content sections
    const sections = extractSections(html);
    
    // Generate suggested keywords if none provided
    let suggestedKeywords = [];
    if (!keyword) {
      const title = parsedData.metadata?.raw?.title || "";
      const description = parsedData.metadata?.raw?.description || "";
      const h1Text = parsedData.content?.raw?.headings?.h1?.join(" ") || "";
      
      const text = `${title} ${description} ${h1Text}`.toLowerCase();
      const words = text.match(/\b\w{4,}\b/g) || [];
      const wordCount = {};
      
      words.forEach(word => {
        if (!['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'said', 'each', 'which', 'their', 'time', 'more', 'very', 'what', 'know', 'just', 'first', 'into', 'over', 'think', 'also', 'your', 'work', 'life', 'only', 'can', 'still', 'should', 'after', 'being', 'now', 'made', 'before', 'here', 'through', 'when', 'where', 'much', 'some', 'these', 'many', 'would', 'there'].includes(word)) {
          wordCount[word] = (wordCount[word] || 0) + 1;
        }
      });
      
      suggestedKeywords = Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([word]) => word);
    }
    
    // Combine all data
    const fullData = {
      ...parsedData,
      url: finalUrl,
      redirects,
      intent,
      sections,
      suggestedKeywords,
      timestamp: new Date().toISOString()
    };
    
    // If no keyword provided, return only basic data with keyword selection requirement
    if (!keyword) {
      return res.status(200).json({
        url: finalUrl,
        suggestedKeywords,
        requiresKeyword: true,
        message: "Target keyword required for SEO analysis. Please select one of the suggested keywords or provide your own.",
        keywordPrompt: "Add &keyword=YOUR_KEYWORD to the URL to proceed with full SEO analysis.",
        basicMetadata: {
          title: parsedData.metadata?.raw?.title || "Missing",
          description: parsedData.metadata?.raw?.description || "Missing",
          wordCount: parsedData.content?.summary?.wordCount || 0
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Add SEO evaluations
    const evaluatedData = addSEOEvaluations(fullData, keyword);
    return res.status(200).json(evaluatedData);
    
  } catch (err) {
    console.error("Full audit failed:", err);
    return res.status(500).json({
      error: "SEO audit failed",
      details: err.message
    });
  }
}
