import type { Menu } from "./menuSchema";

export const MOCK_MENU: Menu = {
  restaurant_name: "Pai Northern Thai Kitchen",
  source_language: "English",
  currency: "CAD",
  estimated_per_person: "$25-$40 CAD",
  items: [
    {
      original_name: "Thai Chicken Wings",
      chinese_name: "泰式炸鸡翅",
      price: "$5",
      original_description:
        "3 chicken wings with crispy shallots, lemongrass and crispy chillies with a sweet tamarind sauce",
      chinese_description: "3 只鸡翅配脆炸葱头、香茅和脆辣椒，搭配甜罗望子酱",
      section: "Snacks & Starters",
      category: "food",
    },
    {
      original_name: "Kung Tawt Sa-Moon Prai",
      chinese_name: "香料炸虎虾",
      price: "$11",
      original_description:
        "6 deep fried breaded black tiger garlic shrimp served with a sweet and spicy thai chilli sauce",
      chinese_description: "6 只裹粉炸蒜香黑虎虾，配泰式酸甜辣酱",
      section: "Snacks & Starters",
      category: "food",
    },
    {
      original_name: "Miang Kung",
      chinese_name: "槟榔叶包鲜虾 (Miang Kung)",
      price: "$14",
      original_description:
        "Chilled baby black tiger shrimp with ginger, solo garlic, shallots, lime, chili, roasted coconut, roasted peanuts and coconut sugar. Tamarind sauce served with fresh wild betel leaf for you to wrap",
      chinese_description:
        "冰镇黑虎虾配生姜、独子蒜、葱头、青柠、辣椒、烤椰丝、烤花生和椰糖，罗望子酱配新鲜槟榔叶自己包着吃",
      section: "Snacks & Starters",
      category: "food",
    },
    {
      original_name: "Grabong",
      chinese_name: "泰式炸南瓜饼 (素)",
      price: "$12",
      original_description:
        "Vegetarian deep fried battered squash fritters with a garlic tamarind dip with nuts",
      chinese_description: "素食炸南瓜面糊饼，配蒜香罗望子坚果蘸酱",
      section: "Snacks & Starters",
      category: "food",
    },
    {
      original_name: "Spring Rolls",
      chinese_name: "素春卷",
      price: "$7",
      original_description:
        "Deep fried vegetarian spring rolls filled with mushrooms, glass noodles, carrots and sprouts served with a sweet and spicy thai chilli sauce",
      chinese_description:
        "炸素春卷，馅料为蘑菇、粉丝、胡萝卜、豆芽，配泰式酸甜辣酱",
      section: "Snacks & Starters",
      category: "food",
    },
    {
      original_name: "Pak Boong Fai Deng (Morning Glory)",
      chinese_name: "火焰爆炒空心菜",
      price: "$12.5",
      original_description:
        "Red flame stir fried morning glory in a house made soya bean vegan paste",
      chinese_description: "自制素食豆瓣酱大火快炒空心菜",
      section: "Snacks & Starters",
      category: "food",
    },
    {
      original_name: "Moo Ping",
      chinese_name: "泰北烤猪肉串",
      price: "$10 (加糯米饭 +$3.5)",
      original_description:
        "Northern Thai sweet grilled pork on a skewer (contains oyster sauce). Add sticky rice for 3.5",
      chinese_description: "泰北甜味烤猪肉串（含蚝油）",
      section: "Snacks & Starters",
      category: "food",
    },
    {
      original_name: "Sai Ua Platter (Northern Thai Sausage)",
      chinese_name: "泰北香肠拼盘",
      price: "$14",
      original_description:
        "Grilled pork belly sausages with fresh tumeric, kafir lime leaves, lemongrass, garlic and shallots served with sticky rice and a northern thai relish (contains oyster sauce and shrimp paste)",
      chinese_description:
        "烤五花肉香肠，含姜黄、青柠叶、香茅、蒜和葱头，配糯米饭和泰北辣酱（含蚝油和虾酱）",
      section: "Snacks & Starters",
      category: "food",
    },
    {
      original_name: "Gai Satay",
      chinese_name: "泰式沙嗲鸡肉串",
      price: "$12",
      original_description:
        "Grilled curry marinated chicken on a skewer with peanut sauce and a thai style cucumber dressing (contains dairy)",
      chinese_description: "咖喱腌制烤鸡肉串，配花生酱和泰式黄瓜酱（含奶制品）",
      section: "Snacks & Starters",
      category: "food",
    },
    {
      original_name: "Som Tum Tad (Papaya Salad)",
      chinese_name: "青木瓜沙拉",
      price: "$12 (干虾) / $13 (腌螃蟹)",
      original_description:
        "Shredded green papaya, tomato, long green beans, garlic, red chili, tamarind juice, coconut sugar, freshly squeezed lime, served with shrimp chips, pork rinds and vermicelli noodles (contains fish sauce)",
      chinese_description:
        "青木瓜丝、番茄、长豆角、蒜、红辣椒、罗望子汁、椰糖、鲜榨青柠汁，配虾片、猪皮和粉丝（含鱼露）",
      section: "Salads",
      category: "food",
    },
    {
      original_name: "Plah Nua (Beef Salad)",
      chinese_name: "泰式牛肉沙拉",
      price: "$13",
      original_description:
        "Grilled beef cooked to medium with roasted rice, mint leaves in a tangy lime sauce (contains fish sauce)",
      chinese_description: "五分熟烤牛肉配烤米粉、薄荷叶，淋酸辣青柠酱（含鱼露）",
      section: "Salads",
      category: "food",
    },
    {
      original_name: "Laap Salad",
      chinese_name: "泰北肉末沙拉 (Laap)",
      price: "$15",
      original_description:
        "Ground pork in a home-made northern thai laap paste with peppercorn, garlic, shallots, galangal, lemongrass, shrimp paste and fennel served with lettuce leaves and sticky rice",
      chinese_description:
        "猪肉末配自制泰北辣酱（胡椒、蒜、葱头、南姜、香茅、虾酱、茴香），配生菜叶和糯米饭",
      section: "Salads",
      category: "food",
    },
    {
      original_name: "Seasonal Thai Dessert",
      chinese_name: "时令泰式甜点",
      price: "$8",
      original_description: null,
      chinese_description: null,
      section: "Desserts",
      category: "food",
    },
  ],
};
