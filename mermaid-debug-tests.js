// ========================================
// MERMAID RENDERER DEBUGGING CONSOLE TESTS
// ========================================
// Run these tests in the browser console while on the Processes page
// to diagnose and verify MermaidRenderer fixes.

console.log('🔧 Starting Mermaid Renderer Debug Tests...');

// Test 1: Check if Mermaid library is loaded and accessible
function testMermaidLibrary() {
    console.log('\n📚 Test 1: Mermaid Library Check');
    console.log('=====================================');
    
    if (typeof window.mermaid !== 'undefined') {
        console.log('✅ window.mermaid is available');
        console.log('✅ Mermaid version:', window.mermaid.version || 'Unknown');
        console.log('✅ Mermaid initialize function:', typeof window.mermaid.initialize);
        console.log('✅ Mermaid render function:', typeof window.mermaid.render);
        console.log('✅ Mermaid parse function:', typeof window.mermaid.parse);
        return true;
    } else {
        console.log('❌ window.mermaid is not available');
        console.log('❌ Check if mermaid library is properly imported');
        return false;
    }
}

// Test 2: Check for Mermaid containers in DOM
function testMermaidContainers() {
    console.log('\n📦 Test 2: Mermaid Container Check');
    console.log('=====================================');
    
    const containers = document.querySelectorAll('[id*="container-mermaid"]');
    console.log('🔍 Found', containers.length, 'mermaid containers');
    
    containers.forEach((container, index) => {
        console.log(`📦 Container ${index + 1}:`, {
            id: container.id,
            hasContent: container.innerHTML.length > 0,
            contentType: container.querySelector('svg') ? 'SVG' : 'Other/Empty',
            visible: container.offsetWidth > 0 && container.offsetHeight > 0,
            dimensions: {
                width: container.offsetWidth,
                height: container.offsetHeight
            }
        });
        
        const svg = container.querySelector('svg');
        if (svg) {
            console.log(`  ✅ SVG found:`, {
                width: svg.getAttribute('width'),
                height: svg.getAttribute('height'),
                viewBox: svg.getAttribute('viewBox'),
                childElements: svg.children.length
            });
        } else {
            console.log('  ❌ No SVG found in container');
            console.log('  📄 Container content preview:', container.innerHTML.substring(0, 100));
        }
    });
    
    return containers.length;
}

// Test 3: Check for MermaidRenderer React components
function testMermaidRendererComponents() {
    console.log('\n⚛️ Test 3: React Component Check');
    console.log('=====================================');
    
    // Look for React fiber nodes (this is a heuristic)
    const reactContainers = document.querySelectorAll('[data-testid*="mermaid"], .MuiBox-root');
    console.log('🔍 Found', reactContainers.length, 'potential React containers');
    
    // Check for loading states
    const loadingSpinners = document.querySelectorAll('.MuiCircularProgress-root');
    console.log('🔄 Found', loadingSpinners.length, 'loading spinners');
    
    // Check for error alerts
    const errorAlerts = document.querySelectorAll('.MuiAlert-colorError');
    console.log('🚨 Found', errorAlerts.length, 'error alerts');
    errorAlerts.forEach((alert, index) => {
        console.log(`  Error ${index + 1}:`, alert.textContent?.substring(0, 100));
    });
    
    return {
        containers: reactContainers.length,
        loading: loadingSpinners.length,
        errors: errorAlerts.length
    };
}

// Test 4: Test Mermaid rendering manually
function testMermaidRendering() {
    console.log('\n🎨 Test 4: Manual Mermaid Rendering');
    console.log('=====================================');
    
    if (!window.mermaid) {
        console.log('❌ Mermaid not available, skipping render test');
        return false;
    }
    
    const testCode = `
        graph TD
            A[Start] --> B{Is it working?}
            B -->|Yes| C[Great!]
            B -->|No| D[Debug more]
            D --> B
    `;
    
    console.log('🧪 Testing with sample code:', testCode);
    
    // Create a test container
    const testContainer = document.createElement('div');
    testContainer.id = 'mermaid-test-' + Date.now();
    testContainer.style.cssText = 'width: 400px; height: 300px; border: 1px solid red; margin: 10px;';
    document.body.appendChild(testContainer);
    
    const testId = 'test-diagram-' + Date.now();
    
    window.mermaid.render(testId, testCode)
        .then(result => {
            console.log('✅ Manual render successful');
            console.log('📊 SVG length:', result.svg.length);
            testContainer.innerHTML = result.svg;
            console.log('📦 Test container populated');
            
            // Clean up after 5 seconds
            setTimeout(() => {
                testContainer.remove();
                console.log('🧹 Test container cleaned up');
            }, 5000);
        })
        .catch(error => {
            console.log('❌ Manual render failed:', error);
            testContainer.remove();
        });
    
    return true;
}

// Test 5: Monitor DOM changes for new Mermaid containers
function monitorMermaidContainers(duration = 10000) {
    console.log('\n👀 Test 5: DOM Change Monitoring');
    console.log('=====================================');
    console.log('🕐 Monitoring for', duration / 1000, 'seconds...');
    
    let containerCount = 0;
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node as Element;
                    
                    // Check if it's a mermaid container
                    if (element.id && element.id.includes('mermaid')) {
                        containerCount++;
                        console.log(`📦 New mermaid container detected: ${element.id}`);
                    }
                    
                    // Check for SVG additions
                    const svgs = element.querySelectorAll ? element.querySelectorAll('svg') : [];
                    if (svgs.length > 0) {
                        console.log(`🎨 SVG(s) added to DOM:`, svgs.length);
                    }
                }
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    setTimeout(() => {
        observer.disconnect();
        console.log(`🏁 Monitoring ended. Total new containers: ${containerCount}`);
    }, duration);
    
    return observer;
}

// Test 6: Console log filter for Mermaid messages
function showMermaidLogs() {
    console.log('\n📝 Test 6: Console Log Analysis');
    console.log('=====================================');
    console.log('🔍 Recent console logs containing "MermaidRenderer":');
    
    // Note: This is just an instruction since we can't access console history
    console.log('💡 To see MermaidRenderer logs, filter console by "MermaidRenderer"');
    console.log('💡 Look for these key messages:');
    console.log('   - "Container ref set for:"');
    console.log('   - "Mermaid ready for component:"');
    console.log('   - "Starting render for:"');
    console.log('   - "SVG inserted into container for:"');
    console.log('   - Any error messages');
}

// Test 7: Force re-render of existing components
function forceRerender() {
    console.log('\n🔄 Test 7: Force Component Re-render');
    console.log('=====================================');
    
    // Trigger a React state update by dispatching events
    const containers = document.querySelectorAll('[id*="container-mermaid"]');
    
    containers.forEach((container, index) => {
        console.log(`🔄 Triggering rerender for container ${index + 1}: ${container.id}`);
        
        // Dispatch a custom event that might trigger React updates
        container.dispatchEvent(new CustomEvent('resize'));
        container.dispatchEvent(new CustomEvent('focus'));
        
        // Force a style recalculation
        container.style.transform = 'translateZ(0)';
        setTimeout(() => {
            container.style.transform = '';
        }, 100);
    });
    
    console.log('✅ Re-render triggers dispatched');
}

// Main test runner
function runAllTests() {
    console.log('🚀 Running all Mermaid Renderer tests...');
    console.log('==========================================\n');
    
    const results = {
        mermaidLibrary: testMermaidLibrary(),
        containerCount: testMermaidContainers(),
        reactComponents: testMermaidRendererComponents(),
        manualRender: testMermaidRendering()
    };
    
    showMermaidLogs();
    
    console.log('\n📊 Test Summary:');
    console.log('================');
    console.log('📚 Mermaid Library:', results.mermaidLibrary ? '✅' : '❌');
    console.log('📦 Container Count:', results.containerCount);
    console.log('⚛️ React Components:', results.reactComponents);
    console.log('🎨 Manual Render:', results.manualRender ? '✅' : '❌');
    
    console.log('\n🔧 Next Steps:');
    console.log('==============');
    if (!results.mermaidLibrary) {
        console.log('❌ Fix: Ensure mermaid library is properly imported');
    }
    if (results.containerCount === 0) {
        console.log('❌ Fix: Check if MermaidRenderer components are being rendered');
    }
    if (results.reactComponents.loading > 0) {
        console.log('⚠️ Warning: Some components are still loading');
    }
    if (results.reactComponents.errors > 0) {
        console.log('❌ Fix: Address error alerts shown above');
    }
    
    return results;
}

// Export functions to global scope for easy access
window.mermaidDebug = {
    runAllTests,
    testMermaidLibrary,
    testMermaidContainers,
    testMermaidRendererComponents,
    testMermaidRendering,
    monitorMermaidContainers,
    showMermaidLogs,
    forceRerender
};

console.log('✅ Mermaid debug tools loaded!');
console.log('💡 Run window.mermaidDebug.runAllTests() to start debugging');
console.log('💡 Or run individual tests like window.mermaidDebug.testMermaidLibrary()');

// Run initial test
runAllTests();
