export function createEmbedBridge(parentOrigin: string) {
  const safeOrigin = parentOrigin && parentOrigin !== 'null' ? parentOrigin : '*';
  
  return {
    postCart(count: number) {
      if (window.parent && window !== window.parent) {
        window.parent.postMessage({ 
          type: 'leazr:cartUpdate', 
          count 
        }, safeOrigin);
      }
    },
    
    ready() {
      if (window.parent && window !== window.parent) {
        window.parent.postMessage({ 
          type: 'leazr:ready' 
        }, safeOrigin);
      }
    }
  };
}

export function getEmbedParams() {
  const params = new URLSearchParams(window.location.search);
  const isEmbed = params.get('embed') === '1';
  const parentOrigin = params.get('parentOrigin') || '*';
  
  return { isEmbed, parentOrigin };
}