import { joinClasses, sectionWrapClass } from '../../utils/publicPage';

export function PageSection({ className = '', children }) {
  return <section className={joinClasses(sectionWrapClass, className)}>{children}</section>;
}

export default PageSection;
