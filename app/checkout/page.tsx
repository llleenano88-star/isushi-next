import CartSection from '@/components/CartSection';
import { getSettings } from '@/lib/settings';
export const metadata = { title: 'Корзина — iSushiClub' };
export const revalidate = 60;
export default async function CheckoutPage() {
  const { deliveryTime } = await getSettings();
  return <CartSection deliveryTime={deliveryTime} />;
}
