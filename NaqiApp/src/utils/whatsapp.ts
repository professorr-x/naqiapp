import {Linking, Platform} from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import {Order} from '../types';
import {WHATSAPP_NUMBER} from '../constants';
import {toArabicNumerals} from './numbers';

export const formatOrderForWhatsApp = (order: Order, language: string): string => {
  if (language === 'ar') {
    // Arabic message format
    const orderTypeMapAr = {
      oneTime: 'دفتر توصيل أسبوعي',
      weekly: 'دفتر توصيل شهري',
      monthly: 'دفتر توصيل موسّع',
    };

    const timeWindowMapAr = {
      morning: 'صباحاً (٩ص-١م)',
      afternoon: 'مساءً (١م-٦م)',
    };

    const arabicDate = order.deliveryDate.toLocaleDateString('ar-IQ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const notesSection = order.customerNotes
      ? `\nملاحظات: ${order.customerNotes}`
      : '';

    // Calculate delivery count based on bottle quantity (2 bottles per delivery)
    const deliveryCount = order.bottleQuantity / 2;

    // Parse the combined address field
    const addressParts = (order.customerArea || '').split(' - ');
    const area = addressParts[0] || 'غير محدد';
    const landmark = addressParts[1] || 'غير محدد';

    const message = `طلب توصيل مياه نقي

الاسم: ${order.customerName || 'غير محدد'}
المنطقة: ${area}
أقرب نقطة دالة: ${landmark}${notesSection}

نوع الدفتر: ${orderTypeMapAr[order.orderType]}
عدد القسائم: ${toArabicNumerals(deliveryCount)}
كل قسيمة = عبوتين (20 لتر)

يوم التوصيل: ${arabicDate}
الفترة: ${timeWindowMapAr[order.deliveryTimeWindow]}

سعر المياه: ${toArabicNumerals(order.waterCost)} د.ع
تأمين القناني (مسترد): ${toArabicNumerals(order.depositAmount)} د.ع
المبلغ الكلي: ${toArabicNumerals(order.totalPrice)} د.ع

الدفع: نقداً عند أول توصيل

بالضغط على إرسال هذه الرسالة يتم تأكيد طلب التوصيل.
يرجى إرسال موقعك المباشر عبر واتساب لإتمام الطلب.`.trim();

    return message;
  } else {
    // English message format
    const orderTypeMapEn = {
      oneTime: 'Weekly Voucher Book',
      weekly: 'Monthly Voucher Book',
      monthly: 'Extended Voucher Book',
    };

    const timeWindowMapEn = {
      morning: 'Morning (9am-1pm)',
      afternoon: 'Afternoon (1pm-6pm)',
    };

    const englishDate = order.deliveryDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    const notesSection = order.customerNotes
      ? `\nNotes: ${order.customerNotes}`
      : '';

    // Calculate delivery count based on bottle quantity (2 bottles per delivery)
    const deliveryCount = order.bottleQuantity / 2;

    // Parse the combined address field
    const addressParts = (order.customerArea || '').split(' - ');
    const area = addressParts[0] || 'N/A';
    const landmark = addressParts[1] || 'N/A';

    const message = `NAQI Water Delivery Order

Name: ${order.customerName || 'N/A'}
Area: ${area}
Nearest Landmark: ${landmark}${notesSection}

Voucher Type: ${orderTypeMapEn[order.orderType]}
Number of vouchers: ${deliveryCount}
Each voucher = two 20L bottles

Delivery day: ${englishDate}
Time slot: ${timeWindowMapEn[order.deliveryTimeWindow]}

Water Cost: ${order.waterCost.toLocaleString()} IQD
Bottle Deposit (Refundable): ${order.depositAmount.toLocaleString()} IQD
Total Amount: ${order.totalPrice.toLocaleString()} IQD

Payment: Cash on first delivery

By sending this message, your delivery order is confirmed.
Please send your live location via WhatsApp to complete the order.`.trim();

    return message;
  }
};

export const sendOrderViaWhatsApp = async (order: Order, language: string): Promise<void> => {
  const message = formatOrderForWhatsApp(order, language);
  const encodedMessage = encodeURIComponent(message);

  // Format phone number for WhatsApp (remove spaces and special characters, keep + sign)
  const cleanPhoneNumber = WHATSAPP_NUMBER.replace(/\s+/g, '');

  // Try WhatsApp app first (better UX for users who have it)
  const whatsappAppUrl = `whatsapp://send?phone=${cleanPhoneNumber}&text=${encodedMessage}`;

  try {
    const canOpen = await Linking.canOpenURL(whatsappAppUrl);
    if (canOpen) {
      await Linking.openURL(whatsappAppUrl);
      return;
    }
  } catch (error) {
    console.log('WhatsApp app not available:', error);
  }

  // Fallback: Open WhatsApp Web in in-app browser
  // IMPORTANT: Use web.whatsapp.com instead of wa.me to prevent App Store redirects
  // wa.me redirects mobile users to App Store, which violates Apple's guidelines
  const whatsappWebUrl = `https://web.whatsapp.com/send?phone=${cleanPhoneNumber}&text=${encodedMessage}`;

  try {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(whatsappWebUrl, {
        // iOS Options
        dismissButtonStyle: 'cancel',
        preferredBarTintColor: '#25D366', // WhatsApp green
        preferredControlTintColor: 'white',
        readerMode: false,
        animated: true,
        modalPresentationStyle: 'fullScreen',
        modalTransitionStyle: 'coverVertical',
        modalEnabled: true,
        enableBarCollapsing: false,
        // Android Options
        showTitle: true,
        toolbarColor: '#25D366',
        secondaryToolbarColor: 'black',
        navigationBarColor: 'black',
        navigationBarDividerColor: 'white',
        enableUrlBarHiding: true,
        enableDefaultShare: true,
        forceCloseOnRedirection: false,
        // Specify full animation
        animations: {
          startEnter: 'slide_in_right',
          startExit: 'slide_out_left',
          endEnter: 'slide_in_left',
          endExit: 'slide_out_right'
        }
      });
    } else {
      // Last resort: open in external browser
      await Linking.openURL(whatsappWebUrl);
    }
  } catch (error) {
    console.error('Failed to open WhatsApp Web:', error);
    throw new Error(
      language === 'ar'
        ? 'تعذر فتح واتساب. يرجى المحاولة مرة أخرى.'
        : 'Could not open WhatsApp. Please try again.'
    );
  }
};
