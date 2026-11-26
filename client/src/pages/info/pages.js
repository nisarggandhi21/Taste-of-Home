// The text of the footer pages (About, Help, Privacy, ...), kept as data so it is easy to edit.
// Each page: { title, description, intro, sections: [{ heading, paragraphs, list }] }.
//
// The Privacy Policy and Terms describe what this app actually does. They are written in
// plain language as a starting point and should be reviewed before the site takes real orders.

export const LAST_UPDATED = 'November 2026';

// Set VITE_CONTACT_EMAIL to show a contact address on these pages.
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || '';

const contactLine = CONTACT_EMAIL
  ? `You can reach us at ${CONTACT_EMAIL}.`
  : 'For anything about an order, message the cook from your Orders page.';

export const PAGES = {
  about: {
    title: 'About Taste of Home',
    description:
      'Taste of Home connects home cooks with people nearby who want real homemade food.',
    intro:
      'Taste of Home is a marketplace for homemade food. Home cooks list the dishes they make, and people nearby order them for delivery.',
    sections: [
      {
        heading: 'Why we built it',
        paragraphs: [
          'The best food many of us have eaten came out of a home kitchen, not a restaurant. Taste of Home gives the people who cook that food a simple way to sell it, and gives everyone else a way to find it.',
        ],
      },
      {
        heading: 'How it works',
        list: [
          'Cooks create a seller account and list their dishes with a photo, price, delivery time, whether each dish is veg, egg or non-veg, and the allergens it contains.',
          'Buyers browse by category, city, diet and allergens, add dishes to their cart and pay online.',
          'The cook accepts the order, prepares it and delivers it. The buyer can follow each stage and message the cook at any time.',
          'After delivery the buyer can leave a rating and a review.',
        ],
      },
      {
        heading: 'Get in touch',
        paragraphs: [contactLine],
      },
    ],
  },

  help: {
    title: 'Help & FAQ',
    description: 'Answers to common questions about ordering and selling on Taste of Home.',
    intro: 'Quick answers to the questions we hear most.',
    sections: [
      {
        heading: 'Do I need an account to order?',
        paragraphs: [
          'You can browse without one. To order, save favourites, message a cook or leave a review you need a free account.',
        ],
      },
      {
        heading: 'How do I pay?',
        paragraphs: [
          'Payments are made online by card through Stripe when you place the order. We never see or store your card details.',
        ],
      },
      {
        heading: 'Can I cancel an order?',
        paragraphs: [
          'Yes, until the cook accepts it. Open your Orders page and choose Cancel. The cook can also cancel an order until it is out for delivery. In both cases you are refunded in full.',
        ],
      },
      {
        heading: 'Where is my order?',
        paragraphs: [
          'Your Orders page shows the current stage: placed, accepted, preparing, out for delivery or delivered. You can message the cook from there.',
        ],
      },
      {
        heading: 'I have a food allergy. What should I do?',
        paragraphs: [
          'Use the "Free from" filter to see only dishes whose cook has declared their allergens, and always confirm with the cook before ordering. Dishes are made in home kitchens where other ingredients are handled.',
        ],
      },
      {
        heading: 'I forgot my password',
        paragraphs: [
          'Choose "Forgot your password?" on the sign-in page and we will email you a link to set a new one.',
        ],
      },
      {
        heading: 'How do I delete my account?',
        paragraphs: [
          'Open your Profile and choose Delete account. Orders that are still open have to be completed or cancelled first.',
        ],
      },
    ],
  },

  buying: {
    title: 'Buying on Taste of Home',
    description: 'How to find, order and review homemade food on Taste of Home.',
    intro: 'From finding a dish to leaving a review.',
    sections: [
      {
        heading: 'Find something you like',
        list: [
          'Browse by category from the bar at the top, or search from the home page.',
          'Narrow the list by city, budget, diet (veg, egg, non-veg) and allergens.',
          'Sort by best selling, top rated, newest or price.',
          'Tap the heart on a dish to save it to your Favourites.',
        ],
      },
      {
        heading: 'Place your order',
        list: [
          'Add dishes to your cart. A cart holds dishes from one cook at a time, because each cook delivers their own food.',
          'At checkout, enter your delivery address and any notes for the cook, then pay by card.',
          'The order appears on the cook’s Orders page as soon as your payment goes through.',
        ],
      },
      {
        heading: 'After you order',
        list: [
          'Follow the order on your Orders page and message the cook if you need to.',
          'You can cancel for a full refund until the cook accepts the order.',
          'Once it is delivered, rate the dish and leave a review to help other buyers.',
        ],
      },
    ],
  },

  selling: {
    title: 'Selling on Taste of Home',
    description: 'How to list your homemade dishes and manage orders on Taste of Home.',
    intro: 'Turn the food you already cook into orders.',
    sections: [
      {
        heading: 'Get set up',
        list: [
          'Create an account and switch on "Activate the seller account" while registering.',
          'Add your city and a short description of yourself on your Profile. Buyers see both on your dishes.',
        ],
      },
      {
        heading: 'List a dish',
        list: [
          'Choose "Add New Item", then add a clear photo, a title, the price and how long delivery takes.',
          'Say whether the dish is veg, egg or non-veg and tick every allergen it contains. Buyers filter on this, so please be exact.',
          'You can edit a dish at any time, or pause it when you are not cooking it.',
        ],
      },
      {
        heading: 'Handle orders',
        list: [
          'New orders appear on your Orders page with the delivery address and any notes.',
          'Move each order through its stages: accept, start preparing, out for delivery, delivered.',
          'If you cannot fulfil an order, cancel it before it goes out for delivery and the buyer is refunded in full.',
          'Your Items page shows what you have earned and which dish sells best.',
        ],
      },
      {
        heading: 'Your responsibilities',
        paragraphs: [
          'You are responsible for the food you sell: how it is prepared, stored and delivered, the accuracy of your listing, and following the food-safety and business rules that apply where you live.',
        ],
      },
    ],
  },

  safety: {
    title: 'Trust & Safety',
    description: 'How Taste of Home keeps ordering and selling safe.',
    intro: 'What we do, and what we ask of you, to keep the marketplace safe.',
    sections: [
      {
        heading: 'Food safety',
        list: [
          'Food on Taste of Home is prepared in home kitchens by independent cooks, not by us.',
          'Cooks must declare whether each dish is veg, egg or non-veg and which common allergens it contains.',
          'If you have an allergy or a medical dietary need, confirm with the cook before you order.',
          'If something about a dish seems unsafe, do not eat it, and tell the cook and us.',
        ],
      },
      {
        heading: 'Payments',
        list: [
          'Card payments are handled by Stripe. Card details never pass through or get stored on our servers.',
          'An order is only confirmed once the payment has been verified with Stripe.',
          'Keep payments on the site. A cook asking to be paid another way is a warning sign.',
        ],
      },
      {
        heading: 'Your account',
        list: [
          'Passwords are stored in hashed form and can be changed or reset at any time.',
          'Messages are visible only to the two people in the conversation.',
          'Reviews can only be left by buyers who actually ordered the dish.',
        ],
      },
    ],
  },

  standards: {
    title: 'Community Standards',
    description: 'The rules everyone on Taste of Home agrees to follow.',
    intro: 'A few rules that keep Taste of Home a good place to buy and sell food.',
    sections: [
      {
        heading: 'For everyone',
        list: [
          'Be respectful in messages and reviews. No harassment, threats or hate speech.',
          'Be honest. Do not misrepresent who you are, what you sell or what you received.',
          'Keep orders and payments on the site.',
          'Do not use the site for anything illegal.',
        ],
      },
      {
        heading: 'For cooks',
        list: [
          'List only food you prepare yourself, with photos of your own dishes.',
          'Declare diet and allergens accurately and keep your listings up to date.',
          'Accept only the orders you can deliver in the time you promised.',
        ],
      },
      {
        heading: 'For buyers',
        list: [
          'Give a correct delivery address and be available to receive the order.',
          'Review the dish you received, fairly and in your own words.',
        ],
      },
      {
        heading: 'If the rules are broken',
        paragraphs: [
          'We may remove listings or reviews and suspend or close accounts that break these standards.',
        ],
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    description: 'What information Taste of Home collects and how it is used.',
    intro: `Last updated: ${LAST_UPDATED}. This policy explains what information Taste of Home collects, why, and the choices you have.`,
    sections: [
      {
        heading: 'What we collect',
        list: [
          'Account details: username, email address and password (stored only as a hash), and optionally your city, phone number, profile picture and a description.',
          'Orders: the dishes ordered, the price, the delivery name, phone number, address and notes you enter, and the status of the order.',
          'Messages you exchange with other users, and the reviews and votes you leave.',
          'Your saved favourites.',
        ],
      },
      {
        heading: 'What we do not collect',
        paragraphs: [
          'We do not receive or store your card details. Payments are processed by Stripe, which handles that information under its own privacy policy.',
        ],
      },
      {
        heading: 'How we use it',
        list: [
          'To run your account and keep it secure.',
          'To place, deliver and refund orders. The delivery details of an order are shown to the cook fulfilling it.',
          'To send you emails you ask for, such as confirming your address or resetting your password.',
          'To show your public profile (username, picture, city, description) next to your dishes and reviews. Your email address and phone number are never part of your public profile.',
        ],
      },
      {
        heading: 'Who we share it with',
        list: [
          'The other party to an order or conversation, as described above.',
          'Service providers that run parts of the site for us: payment processing (Stripe), image hosting (Cloudinary), email delivery and hosting.',
          'We do not sell your personal information.',
        ],
      },
      {
        heading: 'Cookies and storage on your device',
        list: [
          'A login cookie keeps you signed in for up to 7 days.',
          'Your browser also stores your theme choice, your cart and the last delivery address you used, so you do not have to enter them again. This stays on your device.',
          'We do not use advertising or tracking cookies.',
        ],
      },
      {
        heading: 'Your choices',
        list: [
          'Edit your details on your Profile at any time.',
          'Delete your account from your Profile. This removes your account, your dishes, your reviews and your conversations. Past orders are kept as part of the other person’s order history.',
          ...(CONTACT_EMAIL ? [`Questions about your data? Email ${CONTACT_EMAIL}.`] : []),
        ],
      },
    ],
  },

  terms: {
    title: 'Terms of Service',
    description: 'The terms for using Taste of Home.',
    intro: `Last updated: ${LAST_UPDATED}. By using Taste of Home you agree to these terms.`,
    sections: [
      {
        heading: 'What Taste of Home is',
        paragraphs: [
          'Taste of Home is a marketplace that lets independent home cooks sell food to buyers. We provide the site. We do not prepare, store or deliver the food, and the contract for each order is between the buyer and the cook.',
        ],
      },
      {
        heading: 'Your account',
        list: [
          'Give accurate information and keep your password to yourself. You are responsible for what happens under your account.',
          'You must be old enough to enter into a contract where you live.',
        ],
      },
      {
        heading: 'Orders, payments and refunds',
        list: [
          'Prices are set by cooks and shown in Indian rupees. You pay in full when you place an order.',
          'A buyer can cancel until the cook accepts the order. A cook can cancel until the order is out for delivery. A cancelled order is refunded in full to the original payment method.',
          'If there is a problem with an order that was delivered, contact the cook first through the site.',
        ],
      },
      {
        heading: 'Cooks',
        list: [
          'You are responsible for the food you sell, for the accuracy of your listings including diet and allergen information, and for complying with the food-safety, licensing and tax rules that apply to you.',
          'You agree to fulfil the orders you accept in the time you state.',
        ],
      },
      {
        heading: 'Content',
        paragraphs: [
          'You keep ownership of the photos, descriptions, reviews and messages you post, and you allow us to display them on the site. Do not post anything you do not have the right to post, or anything that breaks our Community Standards.',
        ],
      },
      {
        heading: 'Suspension',
        paragraphs: [
          'We may remove content or suspend accounts that break these terms or the Community Standards.',
        ],
      },
      {
        heading: 'Liability',
        paragraphs: [
          'The site is provided as it is. To the extent the law allows, Taste of Home is not liable for the food sold by cooks, for the conduct of users, or for losses that result from using the site.',
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'We may update these terms. The date at the top shows when they last changed. Continuing to use the site after a change means you accept the new terms.',
        ],
      },
    ],
  },

  contact: {
    title: 'Contact',
    description: 'How to get in touch with Taste of Home.',
    intro: 'The quickest way to get help depends on what you need.',
    sections: [
      {
        heading: 'About an order',
        paragraphs: [
          'Message the cook directly: open your Orders page and use the message button on the order. They can answer questions about the dish, timing and delivery.',
        ],
      },
      {
        heading: 'About your account',
        paragraphs: [
          'Most things can be done from your Profile: changing your details or password, confirming your email, or deleting your account. See Help & FAQ for more.',
        ],
      },
      {
        heading: 'Anything else',
        paragraphs: [
          CONTACT_EMAIL
            ? `Email us at ${CONTACT_EMAIL} and we will get back to you.`
            : 'A contact address will be listed here soon.',
        ],
      },
    ],
  },
};

// Slugs in the order the footer lists them.
export const FOOTER_GROUPS = [
  { heading: 'Company', slugs: ['about', 'contact'] },
  { heading: 'Support', slugs: ['help', 'buying', 'selling', 'safety'] },
  { heading: 'Legal', slugs: ['privacy', 'terms', 'standards'] },
];
