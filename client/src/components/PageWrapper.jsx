import { joinClasses } from '../utils/publicPage';

export function PageWrapper({ children, className = '' }) {
  return (
    <main className={joinClasses('pt-24 pb-16', className)}>
      {children}
    </main>
  );
}

export default PageWrapper;