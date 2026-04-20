import PageLoader from './pageLoader';

export const metadata = {
  title: 'מציאון הדייטים',
  description: 'מצאו דייט ברנדומליות (או לא)',
  icons: {
    icon: '/shooting-star.png',
    apple: '/shooting-star.png',
  },
};

export default function Page() {
  return <PageLoader />;
}