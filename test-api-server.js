const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3010;

app.use(express.json());

let mongoClient;
let db;
let collection;

// Initialize MongoDB connection
const initMongo = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://10.0.0.2:27017/quitus?replicaSet=corrently-lake&readPreference=secondaryPreferred&serverSelectionTimeoutMS=30000&connectTimeoutMS=30000&socketTimeoutMS=30000&maxPoolSize=10&retryWrites=false';
    
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    
    db = mongoClient.db('quitus');
    collection = db.collection('market_partners');
    
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
  }
};

// Helper function to transform MongoDB document to result
const transformDocument = (doc) => {
  const partner = doc.partner;
  
  // Collect all software systems from findings
  const allSoftwareSystems = [];
  if (doc.findings) {
    doc.findings.forEach(finding => {
      if (finding.software_systems) {
        allSoftwareSystems.push(...finding.software_systems);
      }
    });
  }

  return {
    code: partner["﻿BdewCode"] || '',
    companyName: partner.CompanyName || '',
    codeType: partner.BdewCodeType || '',
    source: 'bdew',
    companyUID: partner.CompanyUID,
    postCode: partner.PostCode,
    city: partner.City,
    street: partner.Street,
    country: partner.Country,
    contact: {
      name: partner.CodeContact,
      phone: partner.CodeContactPhone,
      email: partner.CodeContactEmail
    },
    softwareSystems: allSoftwareSystems,
    editedOn: partner.EditedOn,
    validFrom: partner.BdewCodeStatusBegin
  };
};

// Search endpoint
app.get('/api/v1/codes/search', async (req, res) => {
  try {
    const { q, softwareSystems, postCode, city, codeFunction, confidence } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    const searchConditions = [];

    // Full text search
    const searchRegex = new RegExp(q.trim(), 'i');
    searchConditions.push({
      $or: [
        { 'partner.﻿BdewCode': searchRegex },
        { 'partner.CompanyName': searchRegex },
        { 'partner.City': searchRegex },
        { 'partner.PostCode': searchRegex },
        { 'partner.CodeContact': searchRegex },
        { 'partner.BdewCodeFunction': searchRegex }
      ]
    });

    // Apply filters
    if (softwareSystems) {
      const systems = Array.isArray(softwareSystems) ? softwareSystems : [softwareSystems];
      searchConditions.push({
        'findings.software_systems.name': { 
          $in: systems.map(name => new RegExp(name, 'i')) 
        }
      });
    }

    if (postCode) {
      searchConditions.push({
        'partner.PostCode': new RegExp(postCode, 'i')
      });
    }

    if (city) {
      searchConditions.push({
        'partner.City': new RegExp(city, 'i')
      });
    }

    if (codeFunction) {
      searchConditions.push({
        'partner.BdewCodeFunction': new RegExp(codeFunction, 'i')
      });
    }

    if (confidence) {
      const confidenceLevels = Array.isArray(confidence) ? confidence : [confidence];
      searchConditions.push({
        'findings.software_systems.confidence': { $in: confidenceLevels }
      });
    }

    const searchQuery = searchConditions.length > 0 ? { $and: searchConditions } : {};

    const docs = await collection
      .find(searchQuery)
      .limit(50)
      .toArray();

    const results = docs.map(transformDocument);

    res.json({
      success: true,
      data: {
        results,
        count: results.length,
        query: q,
        filters: { softwareSystems, postCode, city, codeFunction, confidence }
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get software systems
app.get('/api/v1/codes/software-systems', async (req, res) => {
  try {
    const pipeline = [
      { $unwind: '$findings' },
      { $unwind: '$findings.software_systems' },
      { $group: { _id: '$findings.software_systems.name' } },
      { $sort: { _id: 1 } }
    ];

    const result = await collection.aggregate(pipeline).toArray();
    const softwareSystems = result.map(item => item._id).filter(Boolean);

    res.json({
      success: true,
      data: {
        softwareSystems,
        count: softwareSystems.length
      }
    });
  } catch (error) {
    console.error('Software systems error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get cities
app.get('/api/v1/codes/cities', async (req, res) => {
  try {
    const cities = await collection.distinct('partner.City');
    const filteredCities = cities.filter(Boolean).sort();

    res.json({
      success: true,
      data: {
        cities: filteredCities,
        count: filteredCities.length
      }
    });
  } catch (error) {
    console.error('Cities error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get code functions
app.get('/api/v1/codes/functions', async (req, res) => {
  try {
    const functions = await collection.distinct('partner.BdewCodeFunction');
    const filteredFunctions = functions.filter(Boolean).sort();

    res.json({
      success: true,
      data: {
        functions: filteredFunctions,
        count: filteredFunctions.length
      }
    });
  } catch (error) {
    console.error('Functions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get code details
app.get('/api/v1/codes/details/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const doc = await collection.findOne({
      'partner.﻿BdewCode': code
    });

    if (!doc) {
      return res.json({
        success: true,
        data: {
          result: null,
          found: false,
          code
        }
      });
    }

    const baseResult = transformDocument(doc);
    
    // Collect all software systems
    const allSoftwareSystems = [];
    if (doc.findings) {
      doc.findings.forEach(finding => {
        if (finding.software_systems) {
          allSoftwareSystems.push(...finding.software_systems);
        }
      });
    }

    const result = {
      ...baseResult,
      findings: doc.findings || [],
      allSoftwareSystems
    };

    res.json({
      success: true,
      data: {
        result,
        found: true,
        code
      }
    });

  } catch (error) {
    console.error('Code details error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    mongodb: !!collection,
    timestamp: new Date().toISOString()
  });
});

// Start server
const startServer = async () => {
  await initMongo();
  
  app.listen(port, () => {
    console.log(`🚀 Code Lookup Test Server running on http://localhost:${port}`);
    console.log('📋 Available endpoints:');
    console.log('  GET /api/v1/codes/search?q=Stadt');
    console.log('  GET /api/v1/codes/software-systems');
    console.log('  GET /api/v1/codes/cities');
    console.log('  GET /api/v1/codes/functions');
    console.log('  GET /api/v1/codes/details/{code}');
    console.log('  GET /health');
  });
};

startServer();
