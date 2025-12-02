const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { parseCoordinatePair } = require('../utils/coordinate-parser');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'csv-upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Function to parse HTML table content from Unstructured response
function parseHtmlTable(htmlString) {
  // Simple regex-based approach to extract table data from HTML
  // This is a basic implementation - for more complex HTML, a proper HTML parser would be needed
  const rows = [];
  const tableMatch = htmlString.match(/<table\b[^>]*>([\s\S]*?)<\/table>/i);
  
  if (tableMatch) {
    const tableContent = tableMatch[1];
    // Find all rows
    const rowMatches = tableContent.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi);
    
    if (rowMatches) {
      for (const rowMatch of rowMatches) {
        const cellMatches = rowMatch[1].match(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi);
        const row = [];
        
        if (cellMatches) {
          for (const cellMatch of cellMatches) {
            // Extract text content from the cell
            const cellText = cellMatch.replace(/<(?:.|\n)*?>/gm, '').trim();
            row.push(cellText);
          }
        }
        
        rows.push(row);
      }
    }
  }
  
  return rows;
}

// Function to normalize headers to standard column names
function normalizeHeaders(headers) {
  const headerMap = {
    'codigo': 'codigo',
    'código': 'codigo',
    'cod': 'codigo',
    'id': 'codigo',
    'e': 'e',
    'easting': 'e',
    'x': 'e',
    'n': 'n',
    'northing': 'n',
    'y': 'n',
    'h': 'h',
    'altitude': 'h',
    'elevacao': 'h',
    'elevação': 'h',
    'descricao': 'descricao',
    'descrição': 'descricao',
    'descricao_levantamento': 'descricao',
    'descrição_levantamento': 'descricao'
  };

  return headers.map(header => {
    const normalized = header.toLowerCase().trim();
    return headerMap[normalized] || normalized;
  });
}

// Function to identify header row and extract data
function extractTableData(rows) {
  if (!rows || rows.length === 0) return { headers: [], data: [] };

  // Look for header row (first row with expected column names)
  let headerRowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map(cell => cell.toLowerCase().trim());
    // Check if this row contains expected headers
    const hasCodigo = row.some(cell => ['codigo', 'código', 'cod', 'id'].includes(cell));
    const hasE = row.some(cell => ['e', 'easting', 'x'].includes(cell));
    const hasN = row.some(cell => ['n', 'northing', 'y'].includes(cell));
    
    if (hasCodigo && (hasE || hasN)) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    // If we can't find headers, assume first row contains headers
    headerRowIndex = 0;
  }

  // Get headers and normalize them
  const originalHeaders = rows[headerRowIndex];
  const headers = normalizeHeaders(originalHeaders);

  // Extract data rows (everything after header row)
  const data = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    if (rows[i].some(cell => cell.trim() !== '')) { // Skip empty rows
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = j < rows[i].length ? rows[i][j] : '';
      }
      data.push(row);
    }
  }

  return { headers, data };
}

// Main route for importing CSV via Unstructured API
router.post('/api/marcos/importar-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const filePath = req.file.path;
    const unstructuredApiUrl = process.env.UNSTRUCTURED_API_URL || 'http://localhost:8000';

    try {
      // Create form data to send the file to Unstructured API
      const form = new FormData();
      form.append('files', fs.createReadStream(filePath));
      form.append('strategy', 'hi_res'); // Use hi_res for better accuracy with tables
      
      // Send the file to Unstructured API
      const unstructuredResponse = await axios.post(
        `${unstructuredApiUrl}/general/v0/general`,
        form,
        {
          headers: {
            ...form.getHeaders(),
          },
          timeout: 30000 // 30 second timeout
        }
      );

      // Process the response from Unstructured API
      const elements = unstructuredResponse.data;
      let tableData = [];

      // Find table elements in the response
      for (const element of elements) {
        if (element.type === 'Table') {
          // If the table has HTML content, parse it
          if (element.metadata && element.metadata.text_as_html) {
            const rows = parseHtmlTable(element.metadata.text_as_html);
            const extracted = extractTableData(rows);
            tableData = [...tableData, ...extracted.data];
          } else if (element.text) {
            // Fallback: if there's plain text, we might need to parse it differently
            // For now, we'll just log this case
            console.log('Found table element with plain text:', element.text);
          }
        }
      }

      // If we didn't find table elements, try to process all elements as potential tabular data
      if (tableData.length === 0) {
        console.log('No table elements found, analyzing all elements...');
        for (const element of elements) {
          if (element.type === 'UncategorizedText' || element.type === 'NarrativeText') {
            // This is basic handling - in a real implementation, you might need more sophisticated parsing
            console.log('Found text element:', element.text.substring(0, 100) + '...');
          }
        }
      }

      if (tableData.length === 0) {
        return res.status(400).json({ error: 'Nenhuma tabela válida encontrada no arquivo CSV' });
      }

      // Connect to database
      const client = new Client({
        user: process.env.DB_USER || 'seu_usuario',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'nome_do_banco',
        password: process.env.DB_PASS || 'sua_senha',
        port: process.env.DB_PORT || 5432,
      });
      
      await client.connect();

      let importedCount = 0;
      let pendingCount = 0;

      // Process each row and insert into database
      for (const row of tableData) {
        const { codigo, e, n, h, descricao } = row;
        
        if (!codigo) {
          continue; // Skip rows without a code
        }

        // Parse coordinates
        const coordResult = parseCoordinatePair(e, n);
        
        // Prepare the database insert/update query
        let query, queryParams;
        if (coordResult.valid) {
          // If coordinates are valid, create geometry and set status as VALIDADO
          query = `
            INSERT INTO marcos_levantados (codigo, descricao, h, n, e, geometry, status)
            VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($4, $5), 31982), 'VALIDADO')
            ON CONFLICT (codigo) DO UPDATE SET
              descricao = EXCLUDED.descricao,
              h = EXCLUDED.h,
              n = EXCLUDED.n,
              e = EXCLUDED.e,
              geometry = ST_SetSRID(ST_MakePoint(EXCLUDED.e, EXCLUDED.n), 31982),
              status = 'VALIDADO'
          `;
          queryParams = [codigo, descricao || '', h || null, coordResult.lat, coordResult.lng];
        } else {
          // If coordinates are invalid, don't create geometry and set status as PENDENTE
          query = `
            INSERT INTO marcos_levantados (codigo, descricao, h, n, e, status)
            VALUES ($1, $2, $3, $4, $5, 'PENDENTE')
            ON CONFLICT (codigo) DO UPDATE SET
              descricao = EXCLUDED.descricao,
              h = EXCLUDED.h,
              n = $4,
              e = $5,
              status = 'PENDENTE'
          `;
          queryParams = [codigo, descricao || '', h || null, n || null, e || null];
        }
        
        try {
          await client.query(query, queryParams);
          if (coordResult.valid) {
            importedCount++;
          } else {
            pendingCount++;
          }
        } catch (dbError) {
          console.error(`Error inserting/updating marco with code ${codigo}:`, dbError);
          // Continue processing other rows even if one fails
        }
      }

      await client.end();

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      res.status(200).json({
        message: 'Importação concluída com sucesso',
        imported: importedCount,
        pending: pendingCount
      });

    } catch (unstructuredError) {
      console.error('Error communicating with Unstructured API:', unstructuredError);
      
      // Clean up uploaded file even if Unstructured API call fails
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      res.status(500).json({
        error: 'Erro ao processar o arquivo com a API Unstructured',
        details: unstructuredError.message
      });
    }
  } catch (error) {
    console.error('Error in CSV import route:', error);
    
    // Clean up uploaded file in case of error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      error: 'Erro interno ao processar o upload',
      details: error.message
    });
  }
});

module.exports = router;