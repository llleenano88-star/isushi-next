import CartSection from '@/components/CartSection';
import { getSettings } from '@/lib/settings';
export const metadata = { title: 'Корзина — iSushiClub' };
export const revalidate = 60;
export default async function CheckoutPage() {
  const { cart } = await getSettings();
  return <CartSection settings={cart} />;
}
