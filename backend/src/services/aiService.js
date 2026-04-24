const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

// Helper function to clean AI responses - removes markdown code blocks and extracts JSON
const cleanAIResponse = (content) => {
  if (!content) return content;

  let cleaned = content.trim();

  // Aggressively remove ALL markdown code block markers
  cleaned = cleaned
    .replace(/^```json\s*/gi, '')
    .replace(/^```\s*/gi, '')
    .replace(/\s*```\s*$/gi, '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  // Try to extract JSON object from the cleaned content
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      // Validate it's proper JSON
      JSON.parse(jsonStr);
      return jsonStr;
    } catch (e) {
      // JSON parse failed, return the cleaned content anyway
      console.error('Failed to parse JSON from AI response:', e.message);
      return cleaned;
    }
  }

  return cleaned;
};

const makeOpenRouterRequest = async (messages, model = OPENROUTER_MODEL) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: model,
      messages: messages,
      max_tokens: 4000,
      temperature: 0.7
    });

    const url = new URL(OPENROUTER_BASE_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Regulatory Compliance'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.error) {
            reject(new Error(parsed.error.message || 'OpenRouter API error'));
          } else {
            resolve(parsed);
          }
        } catch (error) {
          reject(new Error('Failed to parse OpenRouter response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
};

const aiService = {
  // ==========================================
  // AI GDPR SCANNER
  // ==========================================
  scanGDPRCompliance: async (systemData, dataCategories) => {
    const messages = [
      {
        role: 'system',
        content: `You are an expert GDPR compliance scanner. Analyze systems for GDPR compliance and provide detailed findings. IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no code blocks, no additional text). The JSON must contain: complianceScore (0-100), findings (array of objects with category, severity, status, details), recommendations (array of objects with priority, area, action, timeline), riskLevel (Critical/High/Medium/Low), dataProtectionGaps (array of strings), and summary (string).`
      },
      {
        role: 'user',
        content: `Perform a comprehensive GDPR compliance scan for:

System: ${JSON.stringify(systemData)}
Data Categories: ${dataCategories?.join(', ') || 'Personal data'}

Analyze for:
1. Data collection practices
2. Consent mechanisms
3. Data subject rights implementation
4. Data security measures
5. Cross-border transfer compliance
6. Data retention policies
7. Privacy by design implementation
8. Breach notification procedures

Respond with ONLY a JSON object (no markdown formatting).`
      }
    ];

    const response = await makeOpenRouterRequest(messages);
    return cleanAIResponse(response.choices[0].message.content);
  },

  // ==========================================
  // AI POLICY GENERATOR
  // ==========================================
  generatePolicy: async (policyType, requirements) => {
    const messages = [
      {
        role: 'system',
        content: `You are an expert compliance policy writer. Generate professional, comprehensive policies. IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no code blocks). The JSON must contain: title (string), policyType (string), version (string), effectiveDate (string), sections (array of objects with title and content), summary (string), applicability (string), and reviewSchedule (string).`
      },
      {
        role: 'user',
        content: `Generate a professional ${policyType} policy document.

Requirements and context:
${requirements}

Include these sections:
1. Purpose and Scope
2. Definitions
3. Policy Statements
4. Roles and Responsibilities
5. Procedures
6. Compliance Monitoring
7. Exceptions Process
8. Review and Updates
9. Related Documents
10. Appendices (if applicable)

Respond with ONLY a JSON object (no markdown formatting).`
      }
    ];

    const response = await makeOpenRouterRequest(messages);
    return cleanAIResponse(response.choices[0].message.content);
  },

  // ==========================================
  // AI AUDIT SCHEDULER
  // ==========================================
  generateAuditSchedule: async (auditContext) => {
    const messages = [
      {
        role: 'system',
        content: `You are an expert audit planning specialist. Create comprehensive audit schedules based on risk assessments and regulatory requirements. IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no code blocks). The JSON must contain: recommendedFrequency, priority (Critical/High/Medium/Low), scope (array), keyAreas (array), estimatedDuration, requiredResources (array), prerequisites (array), recommendations (array), and timeline (array of phase objects).`
      },
      {
        role: 'user',
        content: `Create an optimized audit schedule for:

${JSON.stringify(auditContext)}

Consider:
1. Risk-based prioritization
2. Regulatory deadlines
3. Resource availability
4. Department criticality
5. Historical findings
6. Industry best practices

Respond with ONLY a JSON object (no markdown formatting).`
      }
    ];

    const response = await makeOpenRouterRequest(messages);
    return cleanAIResponse(response.choices[0].message.content);
  },

  // ==========================================
  // AI VIOLATION PREDICTOR
  // ==========================================
  predictViolations: async (regulationData, companyContext) => {
    const messages = [
      {
        role: 'system',
        content: `You are an expert compliance risk predictor. Analyze patterns and predict potential regulatory violations. IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no code blocks). The JSON must contain: predictions (array of objects with violationType, probability, impactLevel, timeframe), contributingFactors (array), preventiveMeasures (array), riskScore (0-100), summary (string), and recommendations (array).`
      },
      {
        role: 'user',
        content: `Predict potential compliance violations for:

Regulation: ${JSON.stringify(regulationData)}
Company Context: ${companyContext}

Analyze:
1. Historical violation patterns
2. Industry trends
3. Regulatory focus areas
4. Organizational risk factors
5. External risk indicators
6. Operational vulnerabilities

Respond with ONLY a JSON object (no markdown formatting).`
      }
    ];

    const response = await makeOpenRouterRequest(messages);
    return cleanAIResponse(response.choices[0].message.content);
  },

  // ==========================================
  // AI TRAINING TRACKER
  // ==========================================
  analyzeTrainingProgress: async (employeeData, trainingRequirements) => {
    const messages = [
      {
        role: 'system',
        content: `You are an expert compliance training analyst. Analyze training progress and provide personalized recommendations. IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no code blocks). The JSON must contain: overallScore (0-100), complianceStatus (Compliant/At Risk/Non-Compliant), skillGaps (array of strings), recommendations (array of objects with priority and action), priorityTrainings (array of objects with name, priority, duration), summary (string), and completionRate (number).`
      },
      {
        role: 'user',
        content: `Analyze training progress for:

Employee/Department Data: ${JSON.stringify(employeeData)}
Training Requirements: ${JSON.stringify(trainingRequirements)}

Evaluate:
1. Course completion rates
2. Assessment scores
3. Skill gap analysis
4. Certification status
5. Training effectiveness
6. Compliance deadlines

Respond with ONLY a JSON object (no markdown formatting).`
      }
    ];

    const response = await makeOpenRouterRequest(messages);
    return cleanAIResponse(response.choices[0].message.content);
  },

  // ==========================================
  // AI PRIVACY POLICY GENERATOR (Legal)
  // ==========================================
  generatePrivacyPolicy: async (policyParams) => {
    const messages = [
      {
        role: 'system',
        content: `You are a privacy policy generator that outputs ONLY valid JSON. Never include any text before or after the JSON. Never use markdown code blocks. Start your response with { and end with }.`
      },
      {
        role: 'user',
        content: `Generate a privacy policy as a JSON object with this exact structure:
{
  "title": "Policy title here",
  "effectiveDate": "2024-01-15",
  "summary": "Brief summary of the policy",
  "complianceFrameworks": ["GDPR", "CCPA"],
  "sections": [
    {"title": "Section Title", "content": "Section content here"}
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

Policy parameters: ${JSON.stringify(policyParams)}

Include sections for: Introduction, Data Controller, Data Collected, Purposes, Legal Bases, Data Sharing, International Transfers, Retention, User Rights, Cookies, Security, Children's Privacy, Updates, Contact Info.

OUTPUT ONLY THE JSON OBJECT. No other text.`
      }
    ];

    const response = await makeOpenRouterRequest(messages);
    let content = cleanAIResponse(response.choices[0].message.content);

    // Validate JSON and try to fix common issues
    try {
      JSON.parse(content);
    } catch (e) {
      console.log('JSON validation failed, attempting repair:', e.message);
      // Try to fix common JSON issues
      content = content
        .replace(/,\s*}/g, '}')  // Remove trailing commas before }
        .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
        .replace(/}\s*{/g, '},{')  // Add missing commas between objects
        .replace(/]\s*"/g, '],"')  // Add missing commas after arrays
        .replace(/"\s*{/g, '",{')  // Add missing commas before objects
        .replace(/"\s*\[/g, '":[');  // Fix missing colons

      try {
        JSON.parse(content);
        console.log('JSON repair successful');
      } catch (e2) {
        console.error('JSON repair failed:', e2.message);
        // Return a structured error response
        content = JSON.stringify({
          title: policyParams.policyName || 'Privacy Policy',
          summary: 'Policy generation encountered an error. Please try again.',
          sections: [],
          error: true
        });
      }
    }

    return content;
  },

  // ==========================================
  // AI COMPLIANCE CHECKER (Legal)
  // ==========================================
  checkLegalCompliance: async (checkData) => {
    const messages = [
      {
        role: 'system',
        content: `You are an expert legal compliance analyst. Perform comprehensive legal compliance assessments. IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no code blocks). The JSON must contain: complianceScore (0-100), complianceStatus (Compliant/Partially Compliant/Non-Compliant), gaps (array of objects with area, severity, description), legalRisks (array of strings), recommendations (array of objects with priority and action), requiredActions (array of objects with action and deadline), summary (string), and complianceAreas (array of objects with name, status, score).`
      },
      {
        role: 'user',
        content: `Perform a legal compliance check for:

${JSON.stringify(checkData)}

Assess:
1. Regulatory compliance status
2. Legal documentation adequacy
3. Contract compliance
4. Licensing requirements
5. Reporting obligations
6. Record-keeping compliance
7. Third-party compliance
8. Cross-border requirements

Respond with ONLY a JSON object (no markdown formatting).`
      }
    ];

    const response = await makeOpenRouterRequest(messages);
    return cleanAIResponse(response.choices[0].message.content);
  },

  // ==========================================
  // EXISTING AI FUNCTIONS
  // ==========================================

  // Analyze compliance risk
  analyzeComplianceRisk: async (regulationData, companyContext) => {
    const messages = [
      {
        role: 'system',
        content: `You are an expert compliance analyst specializing in regulatory compliance and risk assessment. IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no code blocks). The JSON must contain: riskLevel (Critical/High/Medium/Low), complianceScore (0-100), requirements (array), gaps (array), recommendations (array), and summary (string).`
      },
      {
        role: 'user',
        content: `Analyze the compliance risk for the following regulation and company context:

Regulation: ${JSON.stringify(regulationData)}

Company Context: ${companyContext || 'General business operations'}

Provide analysis with:
1. Risk level (Critical/High/Medium/Low)
2. Key compliance requirements
3. Potential gaps and risks
4. Recommended actions
5. Compliance score estimate (0-100)

Respond with ONLY a JSON object (no markdown formatting).`
      }
    ];

    const response = await makeOpenRouterRequest(messages);
    return cleanAIResponse(response.choices[0].message.content);
  },

  // Analyze document for compliance
  analyzeDocument: async (documentContent, regulationContext) => {
    const messages = [
      {
        role: 'system',
        content: `You are an expert document compliance analyst. Analyze documents for regulatory compliance. IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no code blocks). The JSON must contain: complianceScore (0-100), findings (array), gaps (array), recommendations (array), and summary (string).`
      },
      {
        role: 'user',
        content: `Analyze this document for compliance:

Document Content:
${documentContent}

Regulation Context: ${regulationContext || 'General compliance requirements'}

Provide analysis with:
1. Compliance score (0-100)
2. Key findings
3. Gaps identified
4. Recommendations
5. Summary

Respond with ONLY a JSON object (no markdown formatting).`
      }
    ];

    const response = await makeOpenRouterRequest(messages);
    return cleanAIResponse(response.choices[0].message.content);
  },

  // Assess vendor risk
  assessVendorRisk: async (vendorData) => {
    const messages = [
      {
        role: 'system',
        content: `You are an expert third-party risk analyst. Assess vendor risks. IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no code blocks). The JSON must contain: riskLevel (Critical/High/Medium/Low), riskScore (0-100), riskFactors (array), dueDiligence (array), contractRecommendations (array), monitoringRecommendations (array), and summary (string).`
      },
      {
        role: 'user',
        content: `Assess the risk for this vendor:

Vendor Information:
${JSON.stringify(vendorData)}

Provide assessment with:
1. Overall risk rating (Critical/High/Medium/Low)
2. Risk factors identified
3. Due diligence requirements
4. Contractual recommendations
5. Monitoring recommendations

Respond with ONLY a JSON object (no markdown formatting).`
      }
    ];

    const response = await makeOpenRouterRequest(messages);
    return cleanAIResponse(response.choices[0].message.content);
  },

  // Analyze incident and recommend response
  analyzeIncident: async (incidentData) => {
    const messages = [
      {
        role: 'system',
        content: `You are an expert incident response analyst. Analyze security incidents. IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no code blocks). The JSON must contain: severity (Critical/High/Medium/Low), rootCause (string), immediateActions (array), containmentStrategies (array), recoveryRecommendations (array), preventionMeasures (array), and summary (string).`
      },
      {
        role: 'user',
        content: `Analyze this security incident:

Incident Details:
${JSON.stringify(incidentData)}

Provide analysis with:
1. Severity assessment
2. Root cause analysis
3. Immediate response actions
4. Containment strategies
5. Recovery recommendations
6. Prevention measures

Respond with ONLY a JSON object (no markdown formatting).`
      }
    ];

    const response = await makeOpenRouterRequest(messages);
    return cleanAIResponse(response.choices[0].message.content);
  },

  // Generate risk assessment
  generateRiskAssessment: async (riskContext) => {
    const messages = [
      {
        role: 'system',
        content: `You are an expert risk assessment specialist. Generate comprehensive risk assessments. IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no code blocks). The JSON must contain: risks (array of objects with name, likelihood, impact, score), overallRiskScore (0-100), riskLevel (Critical/High/Medium/Low), currentControls (array), recommendedControls (array), mitigationStrategy (string), and summary (string).`
      },
      {
        role: 'user',
        content: `Generate a risk assessment for:

Context:
${riskContext}

Include:
1. Risk identification
2. Likelihood assessment (Almost Certain/Likely/Possible/Unlikely/Rare)
3. Impact assessment (Critical/Severe/Major/Moderate/Minor)
4. Risk score calculation
5. Current controls
6. Recommended controls
7. Mitigation strategy
8. Risk owner recommendation

Respond with ONLY a JSON object (no markdown formatting).`
      }
    ];

    const response = await makeOpenRouterRequest(messages);
    return cleanAIResponse(response.choices[0].message.content);
  },

  // Generate compliance report
  generateComplianceReport: async (complianceData, reportType) => {
    const messages = [
      {
        role: 'system',
        content: `You are an expert compliance reporter. Generate professional compliance reports. IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no code blocks). The JSON must contain: title (string), reportType (string), executiveSummary (string), findings (array), complianceStatus (string), complianceScore (0-100), riskHighlights (array), recommendations (array), actionItems (array of objects with action and deadline), and generatedDate (string).`
      },
      {
        role: 'user',
        content: `Generate a ${reportType} compliance report:

Data:
${JSON.stringify(complianceData)}

Include appropriate sections for the report type such as:
- Executive summary
- Key findings
- Compliance status
- Risk highlights
- Recommendations
- Action items

Respond with ONLY a JSON object (no markdown formatting).`
      }
    ];

    const response = await makeOpenRouterRequest(messages);
    return cleanAIResponse(response.choices[0].message.content);
  },

  // Chat with compliance assistant
  chatWithAssistant: async (userMessage, conversationHistory = []) => {
    const messages = [
      {
        role: 'system',
        content: `You are an AI compliance assistant for a regulatory compliance management system. You help users with:
- Understanding regulations (GDPR, CCPA, HIPAA, SOX, PCI-DSS, etc.)
- Compliance best practices
- Risk assessment guidance
- Policy development
- Incident response
- Audit preparation
- Training recommendations

Provide accurate, helpful responses. When uncertain, recommend consulting with legal or compliance professionals.`
      },
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage
      }
    ];

    const response = await makeOpenRouterRequest(messages);
    return response.choices[0].message.content;
  },

  // Regulation explanation
  explainRegulation: async (regulationName) => {
    const messages = [
      {
        role: 'system',
        content: `You are an expert on regulatory compliance. Provide clear, comprehensive explanations of regulations. IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no code blocks). The JSON must contain: name (string), overview (string), applicability (string), keyRequirements (array), rightsAndObligations (array), penalties (array), bestPractices (array), recentUpdates (array), and summary (string).`
      },
      {
        role: 'user',
        content: `Explain the ${regulationName} regulation in detail:

Include:
1. Overview and purpose
2. Who it applies to
3. Key requirements
4. Rights and obligations
5. Penalties for non-compliance
6. Best practices for compliance
7. Recent updates or changes

Respond with ONLY a JSON object (no markdown formatting).`
      }
    ];

    const response = await makeOpenRouterRequest(messages);
    return cleanAIResponse(response.choices[0].message.content);
  },

  // Training content generation
  generateTrainingContent: async (topic, audience) => {
    const messages = [
      {
        role: 'system',
        content: `You are an expert compliance trainer. Create engaging, educational compliance training content. IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no code blocks). The JSON must contain: title (string), topic (string), audience (string), learningObjectives (array), keyConcepts (array of objects with title and description), examples (array), bestPractices (array), commonMistakes (array), quizQuestions (array of objects with question, options, correctAnswer), summaryPoints (array), and estimatedDuration (string).`
      },
      {
        role: 'user',
        content: `Generate compliance training content for:

Topic: ${topic}
Target Audience: ${audience}

Include:
1. Learning objectives
2. Key concepts
3. Real-world examples
4. Best practices
5. Common mistakes to avoid
6. Quiz questions
7. Summary points

Respond with ONLY a JSON object (no markdown formatting).`
      }
    ];

    const response = await makeOpenRouterRequest(messages);
    return cleanAIResponse(response.choices[0].message.content);
  }
};

module.exports = aiService;
