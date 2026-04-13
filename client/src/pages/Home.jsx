import {
  CinematicBanner,
  NearbyRestaurants,
  FeaturedRestaurants,
  FeaturedByMenu,
  FeaturedByCategory,
  TrendingRestaurants,
  FsaRatingSection
} from '../components/public';
import { publicShellClass } from '../utils/publicPage';
import PageWrapper from '../components/PageWrapper';

export default function Home() {
  return (
    <PageWrapper className={publicShellClass}>
      <CinematicBanner />
      
      <div className="my-16">
        <NearbyRestaurants />
      </div>
      
      <div className="my-16">
        <FeaturedRestaurants />
      </div>
      
      <div className="my-16">
        <TrendingRestaurants />
      </div>
      
      <div className="my-16">
        <FeaturedByMenu />
      </div>
      
      <div className="my-16">
        <FeaturedByCategory />
      </div>
      
      <div className="my-16">
        <FsaRatingSection />
      </div>
    </PageWrapper>
  );
}