import React, { createContext, useContext, useEffect, useRef, useState } from "react";

/**
 * TabStateProvider & useTabState
 * Preserves scroll position and local UI state per tab.
 * 
 * Usage:
 * <TabStateProvider>
 *   <YourApp />
 * </TabStateProvider>
 * 
 * In each page:
 * const { scrollRef, restoreScroll } = useTabState("Dashboard");
 * useEffect(() => restoreScroll(), []);
 * <div ref={scrollRef}>...</div>
 */

const TabStateContext = createContext({});

export function TabStateProvider({ children }) {
  const [tabStates, setTabStates] = useState({});

  const saveTabState = (tabName, scrollPos, state) => {
    setTabStates(prev => ({
      ...prev,
      [tabName]: { scrollPos, state, timestamp: Date.now() }
    }));
  };

  const getTabState = (tabName) => {
    return tabStates[tabName] || { scrollPos: 0, state: {}, timestamp: null };
  };

  return (
    <TabStateContext.Provider value={{ saveTabState, getTabState }}>
      {children}
    </TabStateContext.Provider>
  );
}

export function useTabState(tabName) {
  const context = useContext(TabStateContext);
  const containerRef = useRef(null);

  // Guard: ensure context exists
  if (!context || !context.getTabState) {
    return {
      scrollRef: containerRef,
      saveScroll: () => {},
      restoreScroll: () => {}
    };
  }

  const saveScroll = () => {
    if (containerRef.current && context.saveTabState) {
      const scrollPos = containerRef.current.scrollTop || window.scrollY;
      context.saveTabState(tabName, scrollPos, {});
    }
  };

  const restoreScroll = () => {
    if (context.getTabState) {
      const { scrollPos } = context.getTabState(tabName);
      if (containerRef.current && scrollPos) {
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = scrollPos;
          } else {
            window.scrollTo(0, scrollPos);
          }
        }, 0);
      }
    }
  };

  // Save on unmount
  useEffect(() => {
    return () => saveScroll();
  }, [tabName]);

  return {
    scrollRef: containerRef,
    saveScroll,
    restoreScroll
  };
}