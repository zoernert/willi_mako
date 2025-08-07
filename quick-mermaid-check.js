// ========================================
// QUICK MERMAID RENDERER VERIFICATION
// ========================================
// Simple tests to verify the MermaidRenderer fixes

console.log('🔍 Quick Mermaid Renderer Verification');
console.log('======================================');

// Quick check function
function quickCheck() {
    const results = {
        timestamp: new Date().toISOString(),
        mermaidAvailable: !!window.mermaid,
        containers: document.querySelectorAll('[id*="container-mermaid"]').length,
        svgs: document.querySelectorAll('[id*="container-mermaid"] svg').length,
        loadingSpinners: document.querySelectorAll('.MuiCircularProgress-root').length,
        errors: document.querySelectorAll('.MuiAlert-colorError').length
    };
    
    console.log('📊 Current Status:', results);
    
    // Show container details
    const containers = document.querySelectorAll('[id*="container-mermaid"]');
    containers.forEach((container, i) => {
        const svg = container.querySelector('svg');
        console.log(`📦 Container ${i+1} (${container.id}):`, {
            hasContent: container.innerHTML.length > 0,
            hasSVG: !!svg,
            visible: container.offsetWidth > 0 && container.offsetHeight > 0,
            dimensions: `${container.offsetWidth}x${container.offsetHeight}`
        });
    });
    
    // Quick diagnosis
    if (results.mermaidAvailable && results.containers > 0 && results.svgs > 0) {
        console.log('✅ DIAGNOSIS: Mermaid appears to be working correctly!');
    } else if (!results.mermaidAvailable) {
        console.log('❌ DIAGNOSIS: Mermaid library not loaded');
    } else if (results.containers === 0) {
        console.log('❌ DIAGNOSIS: No mermaid containers found');
    } else if (results.svgs === 0) {
        console.log('⚠️ DIAGNOSIS: Containers found but no SVGs rendered');
    }
    
    if (results.loadingSpinners > 0) {
        console.log('🔄 NOTE: Some components still loading');
    }
    
    if (results.errors > 0) {
        console.log('🚨 NOTE: Error alerts present');
    }
    
    return results;
}

// Auto-run check
const initialResults = quickCheck();

// Export for manual use
window.quickMermaidCheck = quickCheck;

console.log('\n💡 Run window.quickMermaidCheck() anytime to re-check status');
