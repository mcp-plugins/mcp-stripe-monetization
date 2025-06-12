#!/usr/bin/env node

/**
 * @file CommonJS Build Script
 * @version 1.0.0
 * @description Builds CommonJS version for Node.js compatibility
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

async function buildCommonJS() {
  console.log('🔨 Building CommonJS version...');
  
  try {
    // Ensure dist-cjs directory exists
    await fs.mkdir(path.join(rootDir, 'dist-cjs'), { recursive: true });
    
    // Copy TypeScript compiled files from dist to dist-cjs
    await copyDirectory(
      path.join(rootDir, 'dist'),
      path.join(rootDir, 'dist-cjs')
    );
    
    // Update package.json in dist-cjs to use CommonJS
    const packageJsonPath = path.join(rootDir, 'dist-cjs', 'package.json');
    const packageJson = {
      type: 'commonjs',
      main: 'index.js',
      types: 'index.d.ts'
    };
    
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    // Convert all .js files to use .cjs extension and CommonJS syntax
    await convertToCommonJS(path.join(rootDir, 'dist-cjs'));
    
    console.log('✅ CommonJS build completed successfully!');
  } catch (error) {
    console.error('❌ CommonJS build failed:', error);
    process.exit(1);
  }
}

async function copyDirectory(src, dest) {
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  await fs.mkdir(dest, { recursive: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function convertToCommonJS(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await convertToCommonJS(filePath);
    } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.cjs')) {
      // Read file content
      let content = await fs.readFile(filePath, 'utf-8');
      
      // Convert ES6 imports/exports to CommonJS
      content = convertImportsExports(content);
      
      // Write back to file
      await fs.writeFile(filePath, content);
      
      // Rename .js to .cjs
      const cjsPath = filePath.replace('.js', '.cjs');
      await fs.rename(filePath, cjsPath);
    }
  }
}

function convertImportsExports(content) {
  // Convert import statements
  content = content.replace(
    /import\s*(?:(\*\s+as\s+\w+)|(\{[^}]+\})|(\w+))?\s*(?:,\s*(?:(\*\s+as\s+\w+)|(\{[^}]+\})|(\w+)))?\s*from\s*['"]([^'"]+)['"]/g,
    (match, namespaceImport, namedImports, defaultImport, namespaceImport2, namedImports2, defaultImport2, modulePath) => {
      const imports = [];
      
      if (defaultImport) imports.push(defaultImport);
      if (defaultImport2) imports.push(defaultImport2);
      if (namedImports) imports.push(namedImports);
      if (namedImports2) imports.push(namedImports2);
      if (namespaceImport) imports.push(namespaceImport);
      if (namespaceImport2) imports.push(namespaceImport2);
      
      // Convert .js extensions to .cjs
      const cjsModulePath = modulePath.endsWith('.js') 
        ? modulePath.replace('.js', '.cjs')
        : modulePath;
      
      if (imports.length === 0) {
        return `require('${cjsModulePath}');`;
      } else if (imports.length === 1) {
        const imp = imports[0];
        if (imp.startsWith('*')) {
          return `const ${imp.replace('* as ', '')} = require('${cjsModulePath}');`;
        } else if (imp.startsWith('{')) {
          return `const ${imp} = require('${cjsModulePath}');`;
        } else {
          return `const ${imp} = require('${cjsModulePath}');`;
        }
      } else {
        // Multiple imports
        const requireStatement = `const _temp = require('${cjsModulePath}');`;
        const assignments = imports.map(imp => {
          if (imp.startsWith('*')) {
            return `const ${imp.replace('* as ', '')} = _temp;`;
          } else if (imp.startsWith('{')) {
            return `const ${imp} = _temp;`;
          } else {
            return `const ${imp} = _temp.default || _temp;`;
          }
        });
        return [requireStatement, ...assignments].join('\n');
      }
    }
  );
  
  // Convert export statements
  content = content.replace(
    /export\s*(?:default\s*)?(?:async\s*)?(function|class|const|let|var)?\s*([^{;]+)?(?:\s*\{([^}]+)\})?(?:\s*from\s*['"]([^'"]+)['"])?;?/g,
    (match, declarationType, declaration, namedExports, fromModule) => {
      if (fromModule) {
        // Re-export from another module
        const cjsModulePath = fromModule.endsWith('.js') 
          ? fromModule.replace('.js', '.cjs')
          : fromModule;
        
        if (namedExports) {
          return `const { ${namedExports} } = require('${cjsModulePath}');\nmodule.exports = { ${namedExports} };`;
        } else {
          return `module.exports = require('${cjsModulePath}');`;
        }
      } else if (namedExports) {
        // Named exports
        return `module.exports = { ${namedExports} };`;
      } else if (declaration) {
        // Export declaration
        if (match.includes('export default')) {
          return `${declarationType || ''} ${declaration};\nmodule.exports = ${declaration.split('=')[0].trim()};`;
        } else {
          return `${declarationType || ''} ${declaration};\nmodule.exports.${declaration.split('=')[0].trim()} = ${declaration.split('=')[0].trim()};`;
        }
      } else {
        return match; // Fallback
      }
    }
  );
  
  // Convert standalone export statements
  content = content.replace(
    /export\s*\{([^}]+)\}/g,
    'module.exports = { $1 };'
  );
  
  return content;
}

// Run the build if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildCommonJS();
}