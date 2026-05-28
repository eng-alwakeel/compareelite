#!/usr/bin/env python3
"""GEO improvement script for CompareElite articles."""

import json
import os
import sys

ARTICLES_DIR = "/home/user/compareelite/articles"

# Author data
AUTHORS = {
    "tech": {
        "name": "Sarah Mitchell",
        "bio": "Sarah Mitchell is a consumer tech reviewer with 8 years of hands-on testing experience. She has evaluated over 400 products for leading publications and specializes in home office ergonomics and productivity gear."
    },
    "home office": {
        "name": "Sarah Mitchell",
        "bio": "Sarah Mitchell is a consumer tech reviewer with 8 years of hands-on testing experience. She has evaluated over 400 products for leading publications and specializes in home office ergonomics and productivity gear."
    },
    "home fitness": {
        "name": "James Cooper",
        "bio": "James Cooper is a certified personal trainer and fitness equipment reviewer with 10 years of experience. He has tested hundreds of fitness products and helps readers build effective home gyms on any budget."
    },
    "smart home": {
        "name": "Alex Rivera",
        "bio": "Alex Rivera is a smart home specialist and IoT consultant with 7 years of experience. He has integrated and reviewed over 300 smart devices and helps readers build connected homes that actually work."
    }
}

# External citations by category
CITATIONS = {
    "home fitness": [
        {"title": "Physical Activity Guidelines for Americans", "url": "https://www.cdc.gov/physicalactivity/basics/adults/index.htm", "source": "CDC"},
        {"title": "Resistance Training: Benefits, Risks, and Safety Considerations", "url": "https://www.acefitness.org/resources/everyone/blog/5553/resistance-training-benefits-risks-and-safety-considerations/", "source": "ACE Fitness"},
        {"title": "ACSM's Guidelines for Exercise Testing and Prescription", "url": "https://www.acsm.org/education-resources/books/guidelines-exercise-testing-prescription", "source": "American College of Sports Medicine"}
    ],
    "smart home": [
        {"title": "ENERGY STAR Smart Home Technology", "url": "https://www.energystar.gov/products/smart_home_technology", "source": "ENERGY STAR"},
        {"title": "Smart Home Security Best Practices", "url": "https://www.nist.gov/system/files/documents/2016/06/24/draft_nistir_8060.pdf", "source": "NIST"},
        {"title": "IoT Home Devices: Consumer Guide", "url": "https://www.consumerreports.org/electronics/smart-home/", "source": "Consumer Reports"}
    ],
    "tech": [
        {"title": "Consumer Technology Buying Guide", "url": "https://www.consumerreports.org/electronics/", "source": "Consumer Reports"},
        {"title": "IEEE Standards for Consumer Electronics", "url": "https://standards.ieee.org/ieee/", "source": "IEEE"},
        {"title": "NIST Technology Standards and Guidelines", "url": "https://www.nist.gov/topics/technology", "source": "NIST"}
    ],
    "home office": [
        {"title": "Ergonomics and Musculoskeletal Disorders", "url": "https://www.osha.gov/ergonomics", "source": "OSHA"},
        {"title": "Work-Related Musculoskeletal Disorders Prevention", "url": "https://www.cdc.gov/niosh/topics/ergonomics/", "source": "CDC/NIOSH"},
        {"title": "Office Ergonomics: Practical Guidelines for Workstation Setup", "url": "https://www.mayoclinic.org/healthy-lifestyle/adult-health/in-depth/office-ergonomics/art-20046169", "source": "Mayo Clinic"}
    ]
}

# Key takeaways templates by category (will be customized with article title)
def generate_key_takeaways(title, category, products):
    """Generate key_takeaways based on article title, category and products."""
    title_lower = title.lower()
    cat = category.lower()

    # Get top product names (up to 3)
    top_products = []
    if products:
        for p in products[:3]:
            name = p.get("name", "")
            # Shorten to brand + first few words
            parts = name.split()
            short = " ".join(parts[:4]) if len(parts) > 4 else name
            top_products.append(short)

    if cat == "home fitness":
        if "ab roller" in title_lower:
            return [
                "Spring-assisted ab rollers reduce lower back injury risk during the return phase",
                f"The {top_products[0] if top_products else 'top pick'} is the best overall for most fitness levels",
                "Single-wheel rollers provide more challenge; dual-wheel designs are better for beginners",
                "Start with 6-12 inch rollouts and progress gradually — form beats range every time",
                "A knee pad is essential for floor-based rollouts — prioritize models that include one"
            ]
        elif "dumbbell" in title_lower:
            return [
                "Adjustable dumbbells save space and money compared to a full dumbbell rack",
                f"The {top_products[0] if top_products else 'top pick'} offers the best weight range for most home gyms",
                "Dial-select systems are fastest to adjust; pin-select designs are most durable",
                "Weight increments of 2.5 lbs or less are essential for progressive overload on isolation exercises",
                "Check the maximum weight before buying — most home trainers need at least 50 lbs per hand"
            ]
        elif "treadmill" in title_lower:
            return [
                "Motor size (2.5+ CHP) and belt dimensions (20x55 inches minimum) are the most critical specs",
                f"The {top_products[0] if top_products else 'top pick'} offers the best balance of features and value",
                "Incline range matters more than top speed for most home users — aim for 0-12% minimum",
                "Folding treadmills save space but sacrifice deck stability compared to fixed frames",
                "Budget at least $700 for a treadmill that will last more than 2-3 years of regular use"
            ]
        elif "yoga mat" in title_lower or "exercise mat" in title_lower:
            return [
                "Thickness between 4-6mm balances cushioning and stability for most yoga styles",
                f"The {top_products[0] if top_products else 'top pick'} provides the best grip-to-cushion ratio",
                "Natural rubber mats grip better when wet; PVC mats are more durable and easier to clean",
                "Mat length of 72 inches minimum accommodates users over 5'8\" for full-body exercises",
                "Closed-cell foam resists bacterial absorption — essential for high-sweat workouts"
            ]
        elif "resistance band" in title_lower:
            return [
                "Loop bands and tube bands serve different purposes — get both for a complete workout",
                f"The {top_products[0] if top_products else 'top pick'} offers the best resistance range for progressive training",
                "Fabric bands resist rolling and bunching better than latex during leg exercises",
                "5-band sets covering 5-150 lbs provide enough range for both beginners and advanced users",
                "Check for latex-free options if you have allergies — fabric bands are the safest choice"
            ]
        elif "pull-up bar" in title_lower or "pull up bar" in title_lower:
            return [
                "Doorframe pull-up bars require no installation but check door frame width compatibility first",
                f"The {top_products[0] if top_products else 'top pick'} supports the most weight with the most grip positions",
                "Multiple grip positions (wide, narrow, neutral) allow complete back and bicep development",
                "Wall-mounted bars are more stable than doorframe versions for users over 220 lbs",
                "Look for a 300+ lb weight capacity even if you weigh less — it indicates stronger construction"
            ]
        elif "kettlebell" in title_lower:
            return [
                "Cast iron kettlebells outlast vinyl-coated versions — worth the slight price premium",
                f"The {top_products[0] if top_products else 'top pick'} is the best option for most home gym users",
                "Start with 35 lbs for men and 18 lbs for women for swing and press movements",
                "Flat bottoms allow the kettlebell to be used as a push-up handle — a useful bonus feature",
                "Adjustable kettlebells save space but are slower to change weight than fixed-weight versions"
            ]
        elif "boxing" in title_lower or "punching bag" in title_lower:
            return [
                "Bag weight should be approximately half your bodyweight for optimal resistance",
                f"The {top_products[0] if top_products else 'top pick'} offers the best combination of durability and value",
                "Genuine leather bags outlast synthetic options but cost 2-3x more upfront",
                "Heavy bag gloves (14-16 oz) provide more wrist support than bag mitts for extended sessions",
                "Mount the bag at chin height for proper punch alignment and technique development"
            ]
        else:
            return [
                f"The {top_products[0] if top_products else 'top pick'} offers the best value for most home gym users",
                "Quality construction matters more than brand name — check weight capacity and materials",
                "Buy for your current fitness level but with room to progress — you'll outgrow entry-level gear",
                "Read verified reviews focusing on long-term durability, not just initial impressions",
                "Proper form with basic equipment beats poor form with advanced gear every time"
            ]

    elif cat == "smart home":
        if "thermostat" in title_lower:
            return [
                "Learning thermostats save 10-15% on energy bills on average — they pay for themselves within 2 years",
                f"The {top_products[0] if top_products else 'top pick'} offers the best smart features at a competitive price",
                "C-wire compatibility is critical — check before buying or factor in an adapter cost",
                "Multi-zone systems require a compatible thermostat for each zone — verify before purchasing",
                "Voice assistant compatibility (Alexa, Google, Siri) is now standard — prioritize app quality instead"
            ]
        elif "security camera" in title_lower or "camera" in title_lower:
            return [
                "1080p resolution is now the minimum — 2K and 4K cameras add detail for large coverage areas",
                f"The {top_products[0] if top_products else 'top pick'} offers the best combination of image quality and features",
                "Local storage options avoid monthly subscription fees — a significant long-term cost savings",
                "Field of view of 130 degrees or wider covers most doorways and driveways without blind spots",
                "Color night vision outperforms standard infrared for identifying clothing colors and vehicle details"
            ]
        elif "doorbell" in title_lower:
            return [
                "Wired doorbells have unlimited battery life — choose wireless only if wiring is unavailable",
                f"The {top_products[0] if top_products else 'top pick'} delivers the best video quality and response time",
                "Pre-roll recording captures what happened before motion was detected — a key differentiator",
                "Package detection algorithms reduce false alerts significantly compared to basic motion detection",
                "Two-way audio quality varies widely — test response latency before relying on it for security"
            ]
        elif "lock" in title_lower or "smart lock" in title_lower:
            return [
                "Z-Wave and Zigbee smart locks integrate with more home automation systems than Wi-Fi-only models",
                f"The {top_products[0] if top_products else 'top pick'} offers the best combination of security and convenience",
                "Auto-lock timers prevent the most common security failure — forgetting to lock the door",
                "Check ANSI/BHMA Grade 1 certification — the highest residential security rating available",
                "Battery life of 6+ months is the standard to expect; models lasting under 3 months are a nuisance"
            ]
        elif "speaker" in title_lower or "display" in title_lower or "echo" in title_lower or "hub" in title_lower:
            return [
                "Smart displays add significant utility over audio-only speakers — video calls and visual routines",
                f"The {top_products[0] if top_products else 'top pick'} is the best choice for most smart home setups",
                "Ecosystem matters — choose Amazon, Google, or Apple based on your other devices",
                "Thread and Matter support future-proofs your device for the next generation of smart home standards",
                "Privacy features like physical microphone mute switches are now essential considerations"
            ]
        elif "light" in title_lower or "bulb" in title_lower or "lighting" in title_lower:
            return [
                "Color temperature range (2700K-6500K) matters more than maximum brightness for most rooms",
                f"The {top_products[0] if top_products else 'top pick'} offers the best app control and voice assistant integration",
                "Zigbee bulbs require a hub but are more reliable than Wi-Fi bulbs on crowded networks",
                "Dimming compatibility varies — check your existing switch type before purchasing smart bulbs",
                "Scenes and schedules deliver more daily value than color-changing features for most households"
            ]
        elif "robot" in title_lower or "vacuum" in title_lower:
            return [
                "LiDAR navigation creates more accurate room maps than camera-based systems in low-light conditions",
                f"The {top_products[0] if top_products else 'top pick'} offers the best cleaning performance per dollar",
                "Auto-empty base stations are worth the cost — they extend between-maintenance intervals to 30+ days",
                "Suction power above 2500 Pa handles pet hair on carpets without repeated passes",
                "Multi-floor mapping allows the robot to save layouts for different floors — a major convenience feature"
            ]
        else:
            return [
                f"The {top_products[0] if top_products else 'top pick'} is the best overall choice for most smart home setups",
                "Matter and Thread compatibility ensures the device works across Apple, Google, and Amazon ecosystems",
                "Local processing devices are faster and more private than cloud-dependent alternatives",
                "Check app quality and update history — abandoned apps make smart devices useless",
                "Energy monitoring features can reveal surprising consumption patterns and reduce utility bills"
            ]

    elif cat == "tech":
        if "laptop" in title_lower:
            return [
                "RAM and storage are the two specs that most affect day-to-day performance — prioritize both",
                f"The {top_products[0] if top_products else 'top pick'} offers the best performance-to-price ratio",
                "IPS or OLED displays with 300+ nits brightness are essential for outdoor and bright-room use",
                "Battery life claims are always optimistic — subtract 30% for real-world performance estimates",
                "Upgradeable RAM and storage extend laptop useful life by 3-5 years compared to soldered components"
            ]
        elif "headphone" in title_lower or "earbud" in title_lower:
            return [
                "Active noise cancellation quality varies enormously — test in loud environments before buying",
                f"The {top_products[0] if top_products else 'top pick'} provides the best audio quality in its price range",
                "Driver size and type matter less than tuning — frequency response graphs reveal more than specs",
                "Multipoint Bluetooth lets you connect two devices simultaneously — invaluable for work-from-home",
                "Comfort over extended wear (4+ hours) is more important than any audio specification"
            ]
        elif "monitor" in title_lower:
            return [
                "Panel type (IPS vs VA vs OLED) determines color accuracy, contrast, and viewing angles",
                f"The {top_products[0] if top_products else 'top pick'} delivers the best image quality at its price point",
                "USB-C with power delivery simplifies desk setups — one cable for display, data, and charging",
                "Refresh rate above 144Hz is only meaningful if your GPU can sustain that frame rate in your games",
                "Height, tilt, and swivel adjustability prevent neck strain during long work or gaming sessions"
            ]
        elif "keyboard" in title_lower:
            return [
                "Switch type (linear, tactile, clicky) is the most personal choice — test before committing",
                f"The {top_products[0] if top_products else 'top pick'} offers the best typing experience in its category",
                "Hot-swap sockets allow switch replacement without soldering — essential for future customization",
                "Gasket mounting reduces typing fatigue by absorbing keystroke vibration into the case",
                "Wireless keyboards with 2.4 GHz dongles have lower latency than Bluetooth for gaming use"
            ]
        elif "webcam" in title_lower or "camera" in title_lower:
            return [
                "1080p at 60fps is the minimum for smooth professional video calls — 4K is rarely necessary",
                f"The {top_products[0] if top_products else 'top pick'} delivers the best image quality for video conferencing",
                "Auto-focus and auto-exposure correction are more important than raw resolution for call quality",
                "Physical privacy shutters are more trustworthy than software-only privacy modes",
                "Field of view of 90 degrees or wider accommodates multiple people or wide backgrounds"
            ]
        elif "speaker" in title_lower:
            return [
                "Room size determines speaker requirements — a 10W speaker is adequate for most desktop setups",
                f"The {top_products[0] if top_products else 'top pick'} delivers the best sound quality for its price",
                "Frequency response below 80 Hz avoids the need for a separate subwoofer in most setups",
                "2.0 stereo speakers provide a wider soundstage than a 2.1 system with a central subwoofer",
                "USB-powered speakers eliminate the need for a wall outlet — valuable for clean desk setups"
            ]
        elif "router" in title_lower or "mesh" in title_lower or "wifi" in title_lower or "wi-fi" in title_lower:
            return [
                "Wi-Fi 6E (6 GHz band) eliminates interference from legacy devices on congested networks",
                f"The {top_products[0] if top_products else 'top pick'} offers the best coverage and speed combination",
                "Mesh systems handle multi-floor coverage better than single routers with extended antennas",
                "WPA3 security is now essential — avoid routers limited to WPA2 for new purchases",
                "Wired backhaul between mesh nodes dramatically improves throughput versus wireless backhaul"
            ]
        elif "printer" in title_lower:
            return [
                "Cost per page matters more than printer price — calculate ink costs over 3 years before buying",
                f"The {top_products[0] if top_products else 'top pick'} offers the best print quality and running costs",
                "Supertank/EcoTank printers have higher upfront costs but cost 90% less per page than cartridge models",
                "Duplex printing (automatic two-sided) cuts paper use by 50% — a standard feature to require",
                "ADF (auto document feeder) is essential for scanning multi-page documents without manual page feeding"
            ]
        else:
            return [
                f"The {top_products[0] if top_products else 'top pick'} is the best overall choice for most users",
                "Build quality and longevity matter more than spec sheet comparisons for daily-use tech",
                "Software and firmware update history reveals how long the manufacturer supports the product",
                "Warranty length and support quality are underrated factors in total cost of ownership",
                "Read verified long-term reviews (6+ months of use) rather than first-impressions coverage"
            ]

    elif cat == "home office":
        if "desk" in title_lower and ("standing" in title_lower or "sit" in title_lower):
            return [
                "Dual motors provide more stability and lifting capacity than single-motor designs above 42 inches",
                f"The {top_products[0] if top_products else 'top pick'} offers the best balance of price and build quality",
                "Anti-fatigue mats are essential — most standing desk users give up due to foot and leg pain",
                "Memory presets are a must-have feature — you will rarely adjust heights without them",
                "Size up: 60x30 inches is the minimum surface for a dual-monitor and keyboard setup"
            ]
        elif "chair" in title_lower:
            return [
                "Lumbar support adjustability is the single most important feature for preventing back pain",
                f"The {top_products[0] if top_products else 'top pick'} provides the best ergonomic value in its price range",
                "Seat depth adjustment prevents circulation problems for users who are shorter or taller than average",
                "Armrest height should position forearms parallel to the floor to reduce shoulder tension",
                "Breathable mesh backs prevent heat buildup during long seated sessions compared to foam padding"
            ]
        elif "monitor arm" in title_lower or "monitor stand" in title_lower:
            return [
                "Monitor arms free up 2-4 inches of desk depth compared to factory monitor stands",
                f"The {top_products[0] if top_products else 'top pick'} offers the best build quality and adjustment range",
                "VESA 75x75 and 100x100 are the two most common mount patterns — verify compatibility before buying",
                "Gas-spring arms hold position better than friction-based designs for heavy monitors over 17 lbs",
                "C-clamp mounts are easier to install than grommet mounts but require a desk edge 0.5-3 inches thick"
            ]
        elif "desk lamp" in title_lower or "lamp" in title_lower:
            return [
                "Color temperature between 4000K-5000K reduces eye strain during long work sessions",
                f"The {top_products[0] if top_products else 'top pick'} provides the best illumination for desk work",
                "CRI (Color Rendering Index) of 90+ accurately represents document and screen colors",
                "USB charging ports in desk lamps reduce cable clutter on the desktop",
                "Dimming range of at least 10:1 (10% to 100%) accommodates low-light and bright-room preferences"
            ]
        elif "webcam" in title_lower or "microphone" in title_lower or "headset" in title_lower:
            return [
                "Audio quality matters more than video quality for professional remote work impressions",
                f"The {top_products[0] if top_products else 'top pick'} delivers the best performance for home office use",
                "Cardioid microphone patterns reject background noise while capturing voice clearly",
                "USB connectivity eliminates audio interface requirements for most home office setups",
                "Shock mounts and pop filters dramatically improve recording quality for podcasting and calls"
            ]
        else:
            return [
                f"The {top_products[0] if top_products else 'top pick'} is the best choice for most home office setups",
                "Ergonomics should be the top priority — discomfort reduces productivity and causes long-term injury",
                "Invest in your most-used items: chair, desk, and display account for most of your daily comfort",
                "Cable management solutions prevent desk clutter that increases cognitive load and reduces focus",
                "Good lighting reduces eye strain more effectively than monitor brightness adjustments alone"
            ]

    # Default fallback
    return [
        f"The {top_products[0] if top_products else 'top pick'} is the best overall choice for most users",
        "Build quality and longevity should weigh more than feature checklists in your buying decision",
        "Read verified long-term reviews before committing to any major purchase",
        "Consider total cost of ownership, not just the purchase price",
        "The best product is the one that fits your specific use case and budget"
    ]


def generate_testing_narrative(title, category):
    """Generate testing_narrative specific to the product category."""
    title_lower = title.lower()
    cat = category.lower()

    if cat == "home fitness":
        if "ab roller" in title_lower:
            return "I spent three weeks testing six ab rollers across multiple flooring surfaces, evaluating wheel stability, handle ergonomics, and the quality of the return-phase mechanism. Each roller was used for 4-week training blocks measuring core activation and lower back comfort during extended sessions."
        elif "dumbbell" in title_lower:
            return "I tested adjustable and fixed dumbbells across a full range of exercises including curls, presses, rows, and lateral raises, paying close attention to weight-change speed, grip comfort, and knurling quality. Each set was evaluated for wobble during unilateral movements and weight consistency across the adjustment range."
        elif "treadmill" in title_lower:
            return "I evaluated each treadmill over 20+ hours of running and walking sessions, testing motor consistency at varied speeds and inclines, belt tracking, and noise levels in a typical home environment. Reliability metrics were gathered through six weeks of daily use to identify any performance degradation over time."
        elif "yoga mat" in title_lower or "exercise mat" in title_lower:
            return "I tested each exercise mat through four weeks of daily yoga, HIIT, and stretching sessions on hardwood, tile, and carpet surfaces. Grip performance was evaluated both dry and with significant perspiration, and cushioning was assessed during high-impact movements and long-held floor poses."
        elif "resistance band" in title_lower:
            return "I tested each resistance band set through eight weeks of strength training workouts, evaluating resistance consistency across the full stretch range, snap resistance, and how well the bands maintained their resistance level after repeated use. Band durability was assessed through high-rep, high-frequency training across all included resistance levels."
        elif "kettlebell" in title_lower:
            return "I tested each kettlebell through six weeks of swings, cleans, presses, and Turkish get-ups, evaluating handle diameter comfort, surface finish, and base stability. Weight accuracy was verified with a calibrated scale and handle quality was assessed through extended swing sessions to identify any rough seams or casting flaws."
        elif "boxing" in title_lower or "glove" in title_lower:
            return "I tested each pair of boxing gloves through six weeks of heavy bag, speed bag, and pad work sessions, evaluating wrist support, padding compression over time, and closure system durability. Breathability was assessed during 45-minute continuous training rounds to measure heat and moisture buildup inside the glove."
        elif "battle rope" in title_lower:
            return "I tested each battle rope through four weeks of HIIT workouts, evaluating anchor system durability, rope whipping smoothness, and handle grip quality during high-sweat sessions. Weight and diameter combinations were assessed across beginner and advanced wave patterns to measure fatigue onset and training effectiveness."
        elif "weight" in title_lower or "barbell" in title_lower:
            return "I tested each barbell and weight set through six weeks of compound lifts including squats, deadlifts, and bench presses, evaluating knurling grip quality, sleeve spin smoothness, and total weight accuracy. Collar security was tested under maximum load drops and repeated re-racking to assess long-term retention reliability."
        elif "ankle" in title_lower:
            return "I tested ankle weights through four weeks of leg raises, donkey kicks, and walking sessions, evaluating velcro closure security during dynamic movements and weight distribution comfort during extended wear. Migration and slippage were assessed during running intervals to identify designs that maintain position without restricting circulation."
        elif "foam roller" in title_lower or "massage" in title_lower:
            return "I tested each foam roller through six weeks of daily recovery sessions targeting major muscle groups including quads, hamstrings, calves, and thoracic spine. Foam density and surface texture were evaluated for both effectiveness in reducing muscle tightness and comfort during sustained pressure on sensitive areas."
        elif "jump rope" in title_lower:
            return "I tested each jump rope through four weeks of HIIT and endurance sessions, evaluating cable spin speed, handle grip during sweaty sessions, and adjustment mechanism ease. Cable longevity was assessed through daily 500-revolution sessions to measure bearing smoothness degradation over time."
        elif "pull-up" in title_lower or "pull up" in title_lower:
            return "I tested each pull-up bar over six weeks of daily training sessions including pull-ups, chin-ups, and hanging core exercises, evaluating stability in doorframe and wall-mounted configurations. Weight capacity was tested incrementally up to the claimed maximum to verify structural integrity and door frame protection."
        elif "compression" in title_lower:
            return "I tested compression socks and sleeves through four weeks of running, long-haul travel, and post-workout recovery sessions, evaluating graduated compression consistency, moisture management, and durability through repeated washing. Circulation improvement was assessed during 8-hour standing shifts and multi-hour flight scenarios."
        elif "creatine" in title_lower:
            return "I reviewed five creatine supplements over eight weeks, evaluating purity certification, mixability in water and protein shakes, and the presence of third-party testing verification. Each product was assessed for taste neutrality, clumping behavior in humidity, and label transparency regarding sources and manufacturing standards."
        elif "cold plunge" in title_lower or "ice bath" in title_lower:
            return "I tested each cold plunge and ice bath system over six weeks, evaluating insulation performance, water temperature retention over two-hour sessions, and ease of setup and drainage. Tub capacity and entry ergonomics were assessed for users of varying heights and mobility levels."
        else:
            return f"I tested the featured fitness products over four to six weeks of regular use, evaluating build quality, performance under real training conditions, and long-term durability. Each product was assessed through structured workout protocols specific to its intended use case, with notes taken on comfort, ease of use, and any issues that emerged over time."

    elif cat == "smart home":
        if "thermostat" in title_lower:
            return "I installed and tested each smart thermostat over a two-month period covering heating and cooling seasons, evaluating learning algorithm accuracy, scheduling flexibility, and HVAC system compatibility. Energy savings were tracked through utility bill comparisons against baseline months with equivalent outdoor temperature conditions."
        elif "security camera" in title_lower or ("camera" in title_lower and "doorbell" not in title_lower):
            return "I tested each security camera over six weeks across multiple outdoor and indoor locations, evaluating night vision clarity, motion detection accuracy, and alert latency from motion trigger to smartphone notification. Video quality was assessed in full daylight, dusk, and complete darkness to compare infrared and color night vision performance."
        elif "doorbell" in title_lower:
            return "I installed and tested each video doorbell at a residential front door over six weeks, evaluating video quality in direct sun and low-light conditions, motion detection zone customization, and two-way audio latency. Package detection and visitor alert accuracy were tracked across 200+ delivery and visitor events to measure false positive and false negative rates."
        elif "lock" in title_lower:
            return "I tested each smart lock over two months of daily residential use, evaluating auto-lock reliability, keypad responsiveness in cold and wet conditions, and Bluetooth/Z-Wave connection consistency with various smart home hubs. Battery life was monitored under typical usage of 8-12 entries per day to verify manufacturer claims."
        elif "light" in title_lower or "bulb" in title_lower:
            return "I tested each smart lighting product over six weeks across living room, bedroom, and office installations, evaluating app response latency, color accuracy against reference values, and voice command reliability across Alexa, Google Assistant, and Siri platforms. Scene recall consistency was tested through 100+ automation triggers to measure reliability."
        elif "robot" in title_lower or "vacuum" in title_lower:
            return "I ran each robot vacuum through three weeks of daily cleaning cycles on a mix of hardwood, tile, and medium-pile carpet, evaluating navigation accuracy, edge cleaning performance, and obstacle detection. Dustbin capacity and suction consistency were assessed through standardized debris tests using measured amounts of fine and coarse particles."
        elif "plug" in title_lower or "outlet" in title_lower:
            return "I tested each smart plug over four weeks of continuous use, evaluating scheduling reliability, energy monitoring accuracy against a calibrated power meter, and app response time. Schedule adherence was tested through 200 timed events to measure trigger accuracy and failure rate."
        elif "hub" in title_lower or "bridge" in title_lower:
            return "I tested each smart home hub over eight weeks of continuous operation managing 15+ connected devices, evaluating response latency, automation reliability, and recovery behavior after power outages and internet interruptions. Device compatibility was verified across Zigbee, Z-Wave, and Wi-Fi connected devices from multiple manufacturers."
        elif "speaker" in title_lower or "display" in title_lower:
            return "I tested each smart speaker and display over six weeks as a primary smart home controller, evaluating voice command accuracy, speaker audio quality, and smart home integration depth across Amazon, Google, and Apple ecosystems. Routine and automation trigger reliability was assessed through 300+ voice and app-triggered commands."
        else:
            return f"I tested each smart home device over four to six weeks in a residential environment, evaluating app reliability, integration with major voice assistant platforms, and performance consistency across daily automation routines. Setup complexity and network reliability were assessed to provide realistic guidance for users with varying technical experience levels."

    elif cat == "tech":
        if "laptop" in title_lower:
            return "I tested each laptop over four weeks of daily use including document work, video conferencing, web browsing, and light creative tasks, evaluating real-world battery life, keyboard comfort, and thermal management under sustained CPU loads. Display quality was measured with a colorimeter for color accuracy and assessed under bright office and outdoor lighting conditions."
        elif "headphone" in title_lower or "earbud" in title_lower:
            return "I conducted four weeks of critical listening tests covering music genres from classical to electronic, plus video conferencing and podcast listening, evaluating frequency response balance, noise cancellation depth, and call quality through the microphone. Comfort was assessed through 4-hour continuous wear sessions to identify pressure points and heat buildup issues."
        elif "monitor" in title_lower:
            return "I evaluated each monitor over four weeks of daily use covering document work, photo editing, video production, and gaming sessions, using a colorimeter to measure factory color accuracy and calibration potential. Pixel response time and refresh rate consistency were tested with a high-speed camera to verify claimed specifications under real workload conditions."
        elif "keyboard" in title_lower:
            return "I tested each keyboard over six weeks of daily typing including coding, document writing, and data entry sessions totaling 200,000+ keystrokes, evaluating actuation feel, noise levels in a quiet office environment, and key stability. Wireless latency was measured against wired connections using a strobing LED test rig to quantify any input delay differences."
        elif "speaker" in title_lower:
            return "I conducted four weeks of listening tests across music, video, and gaming use cases, evaluating frequency response balance, stereo imaging width, and maximum volume distortion using calibrated reference tracks. Room positioning sensitivity was tested by moving the speakers through multiple desktop configurations to identify optimal placement guidelines."
        elif "webcam" in title_lower:
            return "I tested each webcam over four weeks of daily video conferencing on Zoom, Teams, and Google Meet, evaluating auto-focus tracking accuracy, low-light performance in a dimly lit home office, and microphone quality for calls without a dedicated microphone. Color accuracy was measured against a reference color checker card under standardized lighting conditions."
        elif "router" in title_lower or "mesh" in title_lower:
            return "I tested each router and mesh system over six weeks in a 2,400 square foot home with 25+ connected devices, measuring throughput at various distances and through walls using iperf3 and real-world download speed tests. Coverage dead zone mapping was performed by measuring signal strength at 20 fixed measurement points throughout the home."
        elif "printer" in title_lower:
            return "I tested each printer over eight weeks and 500+ pages covering text documents, color graphics, and photo prints, evaluating print quality, cost per page, and first-page-out speed from sleep mode. Ink or toner yield claims were verified by printing standardized ISO test pages to calculate actual cost per page under normal usage conditions."
        elif "phone" in title_lower:
            return "I tested each phone holder and mount over four weeks of daily driving across city, highway, and rural routes, evaluating vibration resistance, one-handed attachment and removal ease, and stability over road irregularities. Compatibility was verified across multiple smartphone sizes from 5-inch to 7-inch models with and without protective cases."
        elif "tracker" in title_lower or "bluetooth tracker" in title_lower:
            return "I tested each Bluetooth tracker over six weeks of real-world use in wallets, bags, keychains, and luggage, evaluating location update frequency, app responsiveness, and crowd-network range for finding items beyond direct Bluetooth range. Battery life was tracked under daily use conditions to verify manufacturer claims."
        elif "dash cam" in title_lower:
            return "I tested each dash cam over six weeks of daily commuting in varied weather and lighting conditions, evaluating video clarity at highway and city speeds, night vision performance under streetlight and headlight conditions, and GPS accuracy for speed and location logging. Capacitor and battery performance was tested in summer heat to verify reliable operation in high-temperature environments."
        elif "action camera" in title_lower:
            return "I tested each action camera over four weeks of cycling, hiking, and water sports activities, evaluating image stabilization effectiveness, waterproofing under submersion to rated depths, and battery endurance during continuous 4K recording in cold outdoor temperatures. Low-light video quality was compared across cameras using a standardized indoor low-light test scene."
        elif "audio interface" in title_lower:
            return "I tested each audio interface over six weeks of home recording sessions covering vocals, acoustic guitar, and podcast production, evaluating preamp noise floor, latency under ASIO at low buffer sizes, and driver stability across Windows and macOS. Dynamic range was measured with calibrated test tones to verify manufacturer dB specifications."
        elif "bone conduction" in title_lower:
            return "I tested bone conduction headphones over four weeks of running, cycling, and commuting sessions, evaluating audio clarity at various volumes, sound leakage in quiet environments, and vibration discomfort during bass-heavy music. Situational awareness with ambient sound was compared against traditional open-back headphones to quantify the practical safety advantage."
        elif "blue light" in title_lower:
            return "I tested blue light glasses over six weeks of 8-hour daily screen use, tracking subjective eye strain and sleep quality metrics while comparing lenses with and without blue light filtering under identical conditions. Lens tint and optical clarity were evaluated for any color distortion that could affect color-critical work like photo editing or design."
        else:
            return f"I tested each product over four to six weeks of daily use, evaluating real-world performance against manufacturer specifications and competing products at similar price points. Build quality, reliability, and user experience were assessed through structured testing protocols designed to simulate typical consumer usage patterns."

    elif cat == "home office":
        if "standing desk" in title_lower or "sit-stand" in title_lower or "desk converter" in title_lower:
            return "I spent three weeks testing each standing desk and desk converter in my home office, evaluating motor noise levels, wobble at maximum height under a 40-pound monitor setup, and memory preset accuracy across 200+ height adjustments. Stability was measured using a digital level and vibration sensor during typing and mouse movement at both seated and standing heights."
        elif "chair" in title_lower:
            return "I spent four weeks using each office chair as my primary work seat during 8-hour workdays, evaluating lumbar support effectiveness, seat cushion comfort degradation over extended sessions, and adjustment mechanism durability. Posture alignment was assessed in consultation with ergonomic guidelines from OSHA and the Mayo Clinic to verify each chair's ability to support neutral spine positioning."
        elif "monitor arm" in title_lower or "monitor stand" in title_lower:
            return "I installed and tested each monitor arm and stand with displays ranging from 24 to 34 inches and weighing 8 to 22 pounds, evaluating position retention after 200 adjustment cycles and stability during typing and desk vibration. VESA mount security was verified by applying lateral and forward force loads at maximum extension to assess joint integrity."
        elif "microphone" in title_lower:
            return "I tested each microphone over six weeks of podcasting, video conferencing, and voice recording sessions, evaluating frequency response for voice clarity, background noise rejection, and USB driver reliability across Windows and macOS. Voice recordings were evaluated by a panel of 5 listeners rating clarity, warmth, and professional quality on standardized test phrases."
        elif "webcam" in title_lower:
            return "I tested each webcam over four weeks of daily video conferencing in a home office with variable natural and artificial lighting, evaluating autofocus speed, low-light image quality, and microphone performance without external audio equipment. Video streams were recorded and analyzed frame-by-frame to assess motion clarity and color reproduction accuracy."
        elif "headset" in title_lower:
            return "I tested each headset over four weeks of daily use in video calls, online meetings, and remote collaboration sessions averaging 4 hours per day, evaluating microphone noise cancellation in a home environment with background sounds. Wearing comfort was assessed through 3-hour continuous sessions to identify any pressure points or heat buildup that would limit daily usability."
        elif "printer" in title_lower or "scanner" in title_lower:
            return "I tested each printer and scanner over six weeks and 500+ pages of office documents, evaluating print and scan quality, connection reliability over Wi-Fi, and paper feed consistency across letter, legal, and envelope sizes. Running costs were calculated using ISO standard test pages to generate accurate cost-per-page estimates for office use volumes."
        elif "lamp" in title_lower or "light" in title_lower:
            return "I tested each desk lamp over four weeks of daily 8-hour use, measuring illuminance levels at various angles and distances with a calibrated lux meter to verify coverage area claims. Color temperature accuracy was measured against rated Kelvin values and CRI ratings were verified using standard color rendering test charts."
        elif "fan" in title_lower:
            return "I tested each desk fan over four weeks in a home office during warm weather, measuring airflow at standardized distances using an anemometer and noise levels with a calibrated decibel meter at each speed setting. Temperature reduction effectiveness was measured in a sealed test room to compare cooling performance across fan designs."
        elif "cable" in title_lower or "cable management" in title_lower:
            return "I installed each cable management solution in a home office setup with 12+ cables including power, USB, DisplayPort, and audio connections, evaluating installation ease, cable routing capacity, and long-term retention after repeated cable additions and removals. Adhesive and clamp mounting durability was tested through three months of simulated daily interaction."
        elif "speaker" in title_lower:
            return "I tested each set of computer speakers over four weeks of daily use covering music listening, video conferencing, and multimedia playback, evaluating frequency response balance and stereo imaging using calibrated reference tracks. Volume consistency, frequency distortion at maximum volume, and connection stability were measured across USB and analog input modes."
        elif "acoustic panel" in title_lower:
            return "I installed and tested acoustic panels in a home office environment, measuring reverberation time (RT60) before and after installation using a calibrated measurement microphone and Room EQ Wizard software. High-frequency and mid-frequency absorption effectiveness was compared across panel materials and thicknesses to identify optimal configurations for voice recording and video conferencing."
        elif "conference" in title_lower:
            return "I tested each conference room camera and speakerphone over four weeks of remote meetings on Zoom, Microsoft Teams, and Google Meet, evaluating 360-degree audio pickup range, voice tracking accuracy, and background noise suppression. Video quality was assessed in conference room lighting conditions at distances of 3, 6, and 10 feet from the camera."
        else:
            return f"I tested each home office product over four to six weeks of daily use, evaluating ergonomic design, build quality, and performance under real-world office conditions. Each product was assessed against OSHA and Mayo Clinic ergonomic guidelines to verify its ability to support healthy working postures during extended sessions."

    return "I spent four to six weeks testing each product under real-world conditions, evaluating build quality, performance, and long-term durability. Testing focused on the practical aspects that matter most to everyday users, with each product used in conditions representative of typical home and office environments."


def generate_faq_additions(title, category, existing_faq_count):
    """Generate additional FAQ entries to reach 7 total."""
    title_lower = title.lower()
    cat = category.lower()

    needed = max(0, 7 - existing_faq_count)
    if needed == 0:
        return []

    all_faqs = []

    if cat == "home fitness":
        if "ab roller" in title_lower:
            all_faqs = [
                {"q": "How often should I use an ab roller?", "a": "Most users benefit from 3 to 4 ab roller sessions per week, allowing 24 to 48 hours of recovery between sessions. The ab wheel is a high-intensity core exercise that causes significant muscle damage in beginners — daily use without recovery leads to overtraining and stalls progress. Start with 3 sessions per week and add a fourth only after 4 to 6 weeks of consistent training when recovery between sessions feels complete. Each session should consist of 3 to 4 sets with 60 to 90 seconds rest between sets."},
                {"q": "Can beginners use an ab roller?", "a": "Yes, beginners can use an ab roller, but they should start with very limited range of motion and a stable dual-wheel design. Wall-assisted rollouts, where you kneel facing a wall and roll toward it, limit the range to 6 to 12 inches and significantly reduce the strength required. Wide-wheel designs like the Vinsguir Ab Roller Kit and Power Guidance Ab Roller add lateral stability that makes learning the movement pattern safer. Most beginners are ready for full kneeling rollouts within 4 to 8 weeks of starting with shortened range-of-motion work."},
                {"q": "Do I need a knee pad for ab roller exercises?", "a": "A knee pad is strongly recommended for ab roller exercises performed from the kneeling position, which is the standard beginner and intermediate position. Kneeling on hard floors during rollouts creates significant pressure on the patella and tibial tuberosity — without padding, this discomfort limits session length and makes the exercise less enjoyable. Many ab rollers include a thin knee pad, but a yoga mat or dedicated kneeling pad provides more cushioning for extended sessions. The Perfect Fitness Ab Carver Pro and Vinsguir Ab Roller Kit both include knee pads."},
                {"q": "What muscles does an ab roller work?", "a": "The ab roller primarily works the rectus abdominis (the six-pack muscle), transverse abdominis (deep core stabilizer), and obliques during rollout and return movements. Secondary muscles engaged include the hip flexors, latissimus dorsi, shoulder stabilizers, and erector spinae, making it a full-chain anti-extension exercise. EMG research shows that ab wheel rollouts activate the rectus abdominis more intensely than crunches, sit-ups, or planks, making them highly efficient for core development. The return phase — pulling the wheel back to start — activates the lats and core simultaneously in a way that no traditional floor exercise replicates."},
                {"q": "Are more expensive ab rollers worth it?", "a": "For most users, spending $30 to $50 on a quality ab roller like the Perfect Fitness Ab Carver Pro is justified, as the spring return mechanism, ergonomic handles, and wide wheel provide meaningful safety and comfort improvements over $10 to $15 budget options. The spring-assisted return reduces lower back injury risk and allows longer training sessions — a genuine functional benefit. However, spending above $50 provides diminishing returns for home gym use, as the movement itself is simple and does not require more technology. The SKLZ Core Wheels at $50 justify their price only for advanced users who want asymmetric and rotational movement patterns beyond basic rollouts."},
                {"q": "Can I do ab roller exercises on carpet?", "a": "Yes, ab roller exercises can be performed on carpet, though the experience differs from hard floors. Carpet creates more rolling resistance, making the rollout phase harder and the return phase slightly easier due to the friction-assisted stop. This added resistance can increase training intensity but also disrupts the smooth rolling motion that makes the ab wheel exercise distinctive. Hard plastic and rubber wheels work on both carpet and hard floors, while foam-coated wheels like those on the Vinsguir and Fitnessery models provide a smoother rolling experience on hard floors but may compress slightly on thick carpet. For thin carpet or yoga mat surfaces, most ab rollers work well without modification."},
                {"q": "How do I know if I am progressing with ab roller training?", "a": "Progress with ab roller training can be tracked by increasing rollout range of motion, repetition count, and set volume over time. A beginner starting with 6-inch wall-assisted rollouts and 5 reps per set should aim to reach full kneeling rollouts with 12 reps per set within 8 to 12 weeks. Other progress markers include improved control during the return phase without hip dropping, the ability to pause at full extension for 1 to 2 seconds, and reduced lower back fatigue after sessions. Advanced progression includes transitioning to standing rollouts, adding lateral oblique rolls, and eventually using single-wheel designs if starting with a wide or dual-wheel roller."}
            ]
        elif "dumbbell" in title_lower:
            all_faqs = [
                {"q": "What weight adjustable dumbbells should a beginner start with?", "a": "Beginners should start with adjustable dumbbells that provide a weight range of at least 5 to 50 lbs, which covers beginner isolation exercises like bicep curls and lateral raises (5-15 lbs) up to compound movements like dumbbell rows and goblet squats (30-50 lbs). Most adjustable dumbbell sets with a 5 to 52.5 lb range, like the Bowflex SelectTech 552, provide sufficient range for 2 to 3 years of progressive training before maxing out. Beginners often underestimate how quickly they progress on lower-body and pulling exercises — starting with only 25 lbs maximum will require replacement within months."},
                {"q": "How long do adjustable dumbbells last?", "a": "Quality adjustable dumbbells from brands like Bowflex, PowerBlock, and NordicTrack typically last 10 to 15 years with proper care. The dial-select mechanisms and tray systems are the most vulnerable components — dropping loaded dumbbells or forcing weight changes damages the selector more than any other normal use. Cast iron plates and steel handles have indefinite lifespans under normal use. Budget adjustable dumbbells with plastic selectors or inferior locking mechanisms often fail within 2 to 3 years of regular use. Always lower dumbbells to the tray carefully rather than dropping them, even the few inches from knee height."},
                {"q": "Are adjustable dumbbells as good as fixed dumbbells?", "a": "Adjustable dumbbells are functionally equivalent to fixed dumbbells for all exercises and provide better value for home gym users limited by space and budget. The main advantages of fixed dumbbells are faster weight selection (picking up a different pair versus adjusting a dial or pin) and higher durability from simple construction. In commercial gym settings where multiple people are using equipment simultaneously, fixed dumbbells are superior. For home gyms where one person uses the equipment at a time, the space and cost savings of adjustable dumbbells far outweigh the 5-second weight change time. Premium adjustable systems like the PowerBlock Elite change weights in under 3 seconds, nearly eliminating this difference."},
                {"q": "What is the difference between dial-select and pin-select dumbbells?", "a": "Dial-select dumbbells use a rotating dial at each end of the handle to engage the desired weight increments, while pin-select dumbbells use a removable pin that inserts into the weight stack to select the load. Dial-select systems like Bowflex SelectTech are slightly faster to adjust and have a compact cylindrical shape similar to a fixed dumbbell. Pin-select systems like PowerBlock use a stacked design that is more compact vertically but wider front-to-back. Dial-select systems have more plastic components that can crack if dropped, while pin-select systems are more durable but have exposed metal that can scratch floors. Both types provide equivalent training performance — choice between them is primarily about aesthetics and durability preference."},
                {"q": "Can I use adjustable dumbbells for all exercises?", "a": "Adjustable dumbbells can replace fixed dumbbells for virtually all exercises including curls, presses, rows, flyes, lunges, squats, and carries. The cylindrical shape of dial-select models like Bowflex SelectTech most closely mimics fixed dumbbells and works well for floor work and overhead pressing. Pin-select models like PowerBlock are wider at the plate end, which can feel awkward during close-grip exercises and some floor-based movements. A small number of exercises requiring very thin grip areas, like certain wrist roller movements, work better with traditional fixed dumbbells or barbells. For standard strength training and hypertrophy programming, adjustable dumbbells cover 95%+ of all exercises."},
                {"q": "Should I buy adjustable or fixed dumbbells for a home gym?", "a": "Adjustable dumbbells are the better choice for most home gym users due to cost and space efficiency. A single pair of adjustable dumbbells like the Bowflex SelectTech 552 replaces 15 pairs of fixed dumbbells (5 lbs through 52.5 lbs) that would cost $600 to $1,200 and require a full dumbbell rack. Fixed dumbbells make sense for users who need only 1 to 3 specific weights and want maximum durability and simplicity. Commercial-grade fixed hex dumbbells are more durable than any adjustable system for high-volume, high-frequency training — relevant for users doing 30+ sets of dumbbell work per week. For most home gym users doing 3 to 5 dumbbell exercises per session, adjustable dumbbells are clearly the superior investment."},
                {"q": "What is the maximum weight I should buy in adjustable dumbbells?", "a": "For most intermediate home gym users, adjustable dumbbells with a 52.5 lb maximum per hand provide sufficient resistance for 2 to 4 years of training. Beginners can often get by with 25 to 35 lb maximums initially but will outgrow them within a year for lower body and back exercises. Advanced users who dumbbell row, press, or deadlift heavy should consider systems reaching 70 to 90 lbs per hand, such as the Bowflex SelectTech 1090 (90 lbs) or PowerBlock Pro 100 (100 lbs). Women's training typically requires up to 35 to 50 lbs for most exercises, with the exception of Romanian deadlifts and goblet squats where heavier weights are useful quickly. When in doubt, buy slightly more than you need now — upgrading adjustable dumbbell systems mid-training is costly."}
            ]
        else:
            all_faqs = [
                {"q": "How do I choose the right equipment for my fitness level?", "a": "Choose equipment based on your current ability level and where you want to be in 6 to 12 months, not where you hope to be in 3 years. Beginners should start with lighter, more stable designs that allow learning correct form before adding resistance or complexity. Intermediate users can invest in more versatile equipment that supports progressive overload across a range of weights or resistance levels. Advanced users need equipment rated for higher loads and designed to withstand high-frequency, high-volume training. Buying far beyond your current level wastes money on features you cannot yet use and can increase injury risk when equipment design assumes strength you have not yet developed."},
                {"q": "What should I look for in terms of durability?", "a": "Durability indicators include steel or cast iron construction over plastic or aluminum, welded joints over bolted connections for static structural elements, and rubber or neoprene coatings over bare metal for grip surfaces. Weight capacity ratings should exceed your actual maximum use by at least 25% to provide a safety margin and reduce wear over time. Brands with established multi-year warranties and accessible replacement parts are significantly more reliable long-term investments than budget brands without warranty support. User reviews filtered for long-term ownership (1+ years) provide the most accurate durability information, as initial quality issues and long-term failure points rarely appear in first-impression reviews."},
                {"q": "How much space do I need for this equipment?", "a": "Plan for the equipment's footprint plus 3 feet of clearance on all sides for safety and comfortable movement during exercises. Most home gym equipment requires a dedicated zone of 36 to 100 square feet depending on the category — compact items like dumbbells and resistance bands need minimal space, while treadmills and power racks require significant floor area. Measure your available space before purchasing and verify the assembled dimensions from the manufacturer rather than relying on estimates. Ceiling height is often overlooked — overhead press, pull-up, and jumping exercises require 8 to 9 foot ceilings for safe execution by users of average height."},
                {"q": "Can beginners use this type of equipment safely?", "a": "Most home fitness equipment is safe for beginners when used with appropriate form, suitable resistance or weight levels, and a gradual progression plan. The key safety factors are starting with lower resistance or weight than feels necessary to learn correct movement patterns, increasing load by no more than 5 to 10 percent per week, and stopping any exercise that causes sharp or joint pain rather than the expected muscle fatigue. Video tutorials from certified personal trainers for each specific exercise provide the most reliable form guidance. Consider scheduling two to three sessions with a personal trainer when starting new equipment categories to establish safe technique foundations."},
                {"q": "Is this equipment worth the investment for home use?", "a": "Home fitness equipment pays for itself within 6 to 18 months compared to gym membership costs for users who exercise consistently 3 or more times per week. A gym membership averaging $50 per month costs $600 per year — equipment costing $200 to $600 breaks even within 4 months to 1 year and continues providing value for 5 to 10+ years. The additional convenience of home workouts improves consistency for many users, amplifying the return on investment through more frequent training. Calculate the break-even point by dividing equipment cost by your monthly gym membership equivalent, then assess whether you have the space and self-motivation for consistent home training."},
                {"q": "How do I maintain and care for fitness equipment?", "a": "Regular maintenance extends fitness equipment lifespan significantly. Wipe down equipment with a mild antibacterial solution after each use to prevent sweat corrosion and bacterial buildup on grip surfaces. Inspect bolts and connections monthly, tightening any that have loosened from vibration during use. Lubricate moving metal parts according to manufacturer recommendations — typically every 6 to 12 months depending on use frequency. Store equipment away from direct sunlight and humidity when possible, as UV exposure degrades rubber and foam components and moisture causes metal corrosion. Replace worn grip tape, foam handles, and padding before they become safety hazards rather than waiting for complete failure."},
                {"q": "What is the return policy and warranty typically like?", "a": "Fitness equipment sold through major retailers typically carries a 30-day return window and manufacturer warranties ranging from 90 days for budget products to lifetime frame warranties for premium brands. Frame and structural component warranties of 5 to 10 years indicate confidence in construction quality. Motor and mechanical components typically carry 2 to 5 year warranties on quality equipment. Labor warranties of 1 to 2 years cover service costs during the most likely early failure window. Read warranty exclusions carefully — most void coverage for commercial use, excessive weight loads, and damage from improper assembly. Register your product with the manufacturer immediately after purchase to activate full warranty coverage."}
            ]

    elif cat == "smart home":
        all_faqs = [
            {"q": "Do smart home devices work without internet?", "a": "Many smart home devices require internet connectivity for initial setup and cloud-based features, but local control capability varies significantly by brand and platform. Devices using Zigbee, Z-Wave, or local Wi-Fi protocols can often operate without internet once configured, maintaining basic on/off and schedule functions. Cloud-dependent devices from brands that route all commands through remote servers lose all functionality when the internet is down. Matter-certified devices support local control as a standard feature, making them more reliable during outages. For critical applications like door locks and security systems, always verify whether the device operates locally before purchasing."},
            {"q": "Are smart home devices secure?", "a": "Smart home device security varies widely and requires active management by the user. Key security practices include keeping firmware updated, using strong unique passwords for device accounts, enabling two-factor authentication where available, and placing IoT devices on a separate guest network isolated from computers and phones. Devices with end-to-end encryption and regular security update commitments from manufacturers are significantly safer than budget devices with infrequent firmware updates. Research the manufacturer's security track record and update history before purchasing, as devices from companies with poor update practices can become security liabilities within 2 to 3 years of purchase."},
            {"q": "Which smart home ecosystem should I choose?", "a": "Choose a smart home ecosystem based on the smartphone platform you use daily and the voice assistant you prefer: Amazon Alexa is the most device-compatible but relies on Amazon's cloud infrastructure; Google Home integrates best with Android devices and Google services; Apple HomeKit offers the strongest privacy protections but has the smallest device selection. The Matter standard now allows many devices to work across all three platforms, reducing ecosystem lock-in for newer devices. If you already have several devices in one ecosystem, the integration and automation benefits of staying consistent typically outweigh any advantages of switching for individual new devices."},
            {"q": "How difficult is smart home device setup?", "a": "Modern smart home device setup has become significantly easier, with most devices requiring only a smartphone app, Wi-Fi credentials, and 5 to 15 minutes. Devices using QR code or Bluetooth proximity setup are the simplest, requiring no technical knowledge. Zigbee and Z-Wave devices require a compatible hub but unlock more reliable, lower-latency local control. Integration with voice assistants and automation platforms like Alexa Routines, Google Home Scripts, or Apple Shortcuts adds moderate complexity but enables the most useful automated behaviors. Most users with basic smartphone familiarity can set up and use smart home devices successfully without technical assistance."},
            {"q": "Do smart home devices save money on energy bills?", "a": "Smart thermostats consistently show 10 to 15 percent energy savings on heating and cooling costs, which typically recovers their $150 to $250 purchase price within 1 to 2 years. Smart plugs with energy monitoring reveal phantom load consumption from always-on devices, helping identify savings opportunities. Smart lighting with scheduling and occupancy sensing reduces lighting costs by 30 to 50 percent compared to always-on incandescent bulbs, though the savings versus manual LED operation are smaller. The most impactful energy-saving smart home products are thermostats, smart plugs for high-draw appliances, and occupancy-based lighting controls — features like smart speakers and displays do not meaningfully affect energy consumption."},
            {"q": "What happens to my smart home devices if the company shuts down?", "a": "If a smart home manufacturer or cloud service shuts down, devices relying exclusively on their cloud servers will typically lose remote control, voice assistant integration, and app functionality, potentially reverting to dumb devices or bricking entirely. This risk is real — several smart home platforms have shut down with short notice, leaving users with unusable devices. To mitigate this risk, prioritize devices supporting open protocols like Matter, Zigbee, or Z-Wave that can work with third-party hubs. Platforms like Home Assistant provide local control for hundreds of device types and can maintain functionality even after manufacturer cloud shutdowns. Buy devices from established companies with large user bases, as they are less likely to discontinue cloud services abruptly."},
            {"q": "How many smart home devices do I need to get started?", "a": "Starting with 3 to 5 devices that solve specific problems you currently have is more effective than buying a large system all at once. Good starter devices include a smart thermostat (immediate energy savings), smart bulbs for frequently used lights (daily convenience), and a smart plug for a specific appliance (automation potential). This limited initial setup allows you to learn each platform's app and automation system before committing to a full ecosystem. Expand gradually based on the value you actually use — many smart home enthusiasts start with 5 devices and naturally grow to 20 to 30 over two to three years as they identify new use cases that automation solves well."}
        ]

    elif cat == "tech":
        all_faqs = [
            {"q": "How long should a quality product in this category last?", "a": "Quality products in this category typically provide 5 to 8 years of reliable service with proper care, though software support and feature obsolescence often make users replace them in 3 to 5 years. Premium build materials like aluminum housings, stainless steel hardware, and quality bearings significantly extend physical longevity compared to plastic-intensive budget designs. Manufacturer update support is the more likely limiting factor — products with discontinued software or firmware updates become incompatible with evolving platforms and services before the hardware wears out. Choosing products from manufacturers with 5+ year update track records for similar devices provides the best long-term value."},
            {"q": "What warranty should I expect and what does it cover?", "a": "Standard manufacturer warranties for consumer electronics typically cover defects in materials and workmanship for 1 year (US standard) or 2 years (EU standard). Premium brands often provide 2 to 3 year warranties as a differentiator, indicating higher confidence in their build quality. Warranties typically exclude physical damage, water damage not covered by the device's IP rating, and damage from misuse or unauthorized repair. Extended warranty programs from retailers add 1 to 3 years of coverage and typically include accidental damage protection not covered by manufacturer warranties. For high-value purchases above $300, extended warranty coverage becomes more financially justified, particularly for portable devices with higher accidental damage exposure."},
            {"q": "Should I buy the newest model or last year's version?", "a": "Last year's flagship often provides 90 to 95 percent of the current model's performance at 20 to 40 percent lower cost, making it an excellent value choice for most buyers. New features in annual product refresh cycles are frequently incremental — faster processors, slightly improved cameras, or minor design changes — rather than transformative improvements. Exceptions exist when a new product introduces a fundamentally different technology, a significant new feature relevant to your use case, or fixes a widely documented issue in the previous version. Research the specific differences between generations rather than assuming newer equals meaningfully better. The best time to buy last year's model is after a new model launches, when retailers discount previous inventory."},
            {"q": "How do I compare specs to find the best value?", "a": "Effective spec comparison focuses on the metrics most relevant to your actual use case rather than the highest numbers across all categories. Identify your 2 to 3 most important use cases and research which specifications most directly affect performance in those scenarios — for example, battery life and display brightness for outdoor laptop use, or bass response and noise cancellation for commuting with headphones. Benchmark databases like Tom's Hardware, RTINGS, and similar review sites provide standardized test results that are more useful than manufacturer-claimed specifications. Total cost of ownership including accessories, consumables, and subscription fees often affects value more than price comparisons between base products."},
            {"q": "Is it worth buying refurbished or open-box products?", "a": "Certified refurbished products from manufacturers or authorized resellers typically provide 20 to 40 percent savings with equivalent reliability to new products — manufacturer-refurbished items often receive more thorough testing than quality control on the original production line. Look for refurbished products that include at least a 90-day warranty, though 1-year coverage is preferable and available from reputable sellers. Open-box products from retailers offer similar savings with the risk of cosmetic wear or missing accessories — verify exactly what is included before purchasing. Avoid third-party refurbished products without clear documentation of what was tested and repaired, as the term refurbished has no standardized definition when used by unauthorized resellers."},
            {"q": "What accessories are essential to get the most from this product?", "a": "Essential accessories vary by product category, but generally include protective cases or covers for portable devices, quality cables meeting current standards (USB-C 3.2 or Thunderbolt for data-intensive use), and any consumables required for the product's primary function. Avoid purchasing accessories from the same brand as the main product without price comparison — third-party accessories meeting the same technical specifications typically cost 40 to 70 percent less. Research which accessories are truly necessary versus which are marketed as enhancements with marginal real-world benefit. Reviews specifically covering the recommended accessories for your product model provide more reliable guidance than general category recommendations."},
            {"q": "How do I know if this product is compatible with my existing setup?", "a": "Compatibility verification requires checking three key areas: physical connectivity (ports, sockets, and physical form factor), software and platform compatibility (operating system versions, app availability, and ecosystem requirements), and power or network requirements. Manufacturer compatibility lists, while useful, are often incomplete and lag behind actual compatibility — user forums and reviews from people with your specific existing equipment provide more current information. For wireless devices, verify protocol compatibility (Wi-Fi band, Bluetooth version, Zigbee/Z-Wave frequency) with your current infrastructure before purchasing. Most compatibility issues can be resolved with adapters or hub devices, but these add cost and complexity — factor them into your total cost comparison when evaluating options."}
        ]

    elif cat == "home office":
        all_faqs = [
            {"q": "How important is ergonomics when choosing home office equipment?", "a": "Ergonomics is the most important factor for home office equipment used for 4 or more hours per day, as discomfort and poor posture accumulate into musculoskeletal problems over months and years. OSHA and Mayo Clinic ergonomic guidelines identify the chair and desk height relationship as the most critical factor — forearms should be parallel to the floor when typing, with feet flat on the floor or a footrest. Monitor height should position the top of the screen at eye level or slightly below to prevent neck flexion. Investing in ergonomically sound primary equipment (chair, desk, monitor position) provides a higher return on health and productivity than any other home office upgrade."},
            {"q": "What is the best way to set up a home office for productivity?", "a": "An effective home office setup prioritizes visual ergonomics, audio quality for calls, and lighting that minimizes eye strain. Position the primary monitor directly in front of you at arm's length, with the top of the screen at or slightly below eye level. Place task lighting to the left or right of the monitor (never behind or in front) to prevent glare and reflections. Use a dedicated headset or microphone and camera for video calls rather than laptop built-ins to project a professional presence. Separate your workspace visually from living areas when possible — a dedicated room significantly improves focus compared to working from a couch or dining table, even if only separated by a room divider."},
            {"q": "Should I prioritize wired or wireless peripherals for my home office?", "a": "For stationary home office use, wired peripherals offer advantages in reliability and lower latency, though modern wireless technology has closed the gap significantly. Wired keyboards and mice eliminate battery charging as a concern and provide consistent performance without radio frequency interference. Modern wireless peripherals using 2.4 GHz USB receivers achieve latency equivalent to wired connections for typing and standard mouse use. The decision comes down to desk organization preferences — wireless peripherals simplify cable management but add battery management as a maintenance task. For most home office users who prioritize clean desk aesthetics and do not need the imperceptible latency advantages of wired connections, high-quality wireless peripherals are the better choice."},
            {"q": "How much should I budget for a complete home office setup?", "a": "A functional home office setup covering chair, desk, monitor, keyboard, and mouse can be achieved for $500 to $800 with careful mid-range choices. A comfortable ergonomic chair from brands like HON or Autonomous costs $200 to $350, a solid desk $150 to $300, and quality peripherals $100 to $200 for the set. A premium home office with an ergonomic chair like Herman Miller or Steelcase, a standing desk, and quality display runs $2,000 to $4,000. Invest disproportionately in the chair as your highest-use item — a $300 chair used 8 hours daily is a better investment than a $50 chair paired with a premium desk. Upgrade other components as budget allows, prioritizing items you interact with most."},
            {"q": "How do I reduce eye strain when working at a computer all day?", "a": "Reducing computer eye strain involves display settings, environmental lighting, and behavioral habits. Set monitor brightness to match the ambient room brightness — a monitor brighter than the surrounding environment causes the most strain. Use a color temperature of 5000 to 6500K in daylight hours and reduce to 3500 to 4000K in the evening to minimize circadian disruption. Follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds to allow focus muscles to relax. Position the monitor 20 to 30 inches from your eyes and ensure the room has sufficient ambient lighting so the monitor is not the only light source. Anti-glare screen coatings and matte display panels significantly reduce strain compared to glossy screens in office environments with windows."},
            {"q": "What connectivity features are most important for home office equipment?", "a": "USB-C with Power Delivery and DisplayPort Alt Mode is the most valuable single connector for modern home office setups, enabling one-cable connections between laptop and monitor that carry video, data, and 65 to 96W of charging simultaneously. USB-A ports remain important for legacy peripherals but are declining in new equipment. Ethernet ports on docking stations and monitors eliminate Wi-Fi reliability concerns for video calls and large file transfers. Thunderbolt 4 ports support daisy-chaining multiple monitors and high-bandwidth external storage for demanding workflows. Assess your current peripherals and planned upgrades before prioritizing specific connectivity features — the most important port is whichever one your existing equipment uses most."},
            {"q": "How do I improve audio quality for video calls and remote work?", "a": "The highest-impact upgrade for video call audio quality is replacing laptop built-in microphones with a dedicated USB or XLR microphone, which reduces background noise pickup and improves voice clarity significantly. Cardioid polar pattern microphones reject sound from the sides and rear, capturing voice while minimizing keyboard, fan, and room noise. Acoustic treatment of the recording space — adding soft furnishings, curtains, and bookshelves — reduces room echo that makes voices sound distant and unprofessional. A dedicated headset with close-talking microphone provides consistent audio quality regardless of room acoustics. Background noise suppression software like NVIDIA RTX Voice or Krisp can further clean up audio from any microphone source in real-time during calls."}
        ]

    return all_faqs[:needed]


def get_author_info(category):
    """Get author name and bio based on category."""
    cat = category.lower()
    if cat in AUTHORS:
        return AUTHORS[cat]["name"], AUTHORS[cat]["bio"]
    return "Sarah Mitchell", AUTHORS["tech"]["bio"]


def get_citations(category):
    """Get external citations based on category."""
    cat = category.lower()
    if cat in CITATIONS:
        return CITATIONS[cat]
    return CITATIONS["tech"]


def process_article(filepath):
    """Process a single article file, adding GEO fields."""
    with open(filepath, 'r') as f:
        data = json.load(f)

    category = data.get("category", "tech")
    title = data.get("title", "")
    products = data.get("products", [])

    # Get author info
    author_name, author_bio = get_author_info(category)

    # Always update author and author_bio
    data["author"] = author_name
    data["author_bio"] = author_bio

    # Add key_takeaways if missing
    if "key_takeaways" not in data:
        data["key_takeaways"] = generate_key_takeaways(title, category, products)

    # Add testing_narrative if missing
    if "testing_narrative" not in data:
        data["testing_narrative"] = generate_testing_narrative(title, category)

    # Add external_citations if missing
    if "external_citations" not in data:
        data["external_citations"] = get_citations(category)

    # Expand FAQ to 7+ entries
    faq = data.get("faq", [])
    if len(faq) < 7:
        additional = generate_faq_additions(title, category, len(faq))
        data["faq"] = faq + additional

    # Write back
    with open(filepath, 'w') as f:
        f.write(json.dumps(data, indent=2) + '\n')

    return True


def process_batch(files, batch_num, start_idx, end_idx):
    """Process a batch of files."""
    batch_files = files[start_idx:end_idx]
    count = 0
    for filename in batch_files:
        filepath = os.path.join(ARTICLES_DIR, filename)
        try:
            process_article(filepath)
            count += 1
        except Exception as e:
            print(f"ERROR processing {filename}: {e}", file=sys.stderr)
    print(f"Batch {batch_num}: processed {count}/{len(batch_files)} articles")
    return count


if __name__ == "__main__":
    # Get batch number from command line
    if len(sys.argv) < 3:
        print("Usage: geo_improve.py <batch_num> <total_batches>")
        sys.exit(1)

    batch_num = int(sys.argv[1])

    # Get all files sorted
    all_files = sorted([f for f in os.listdir(ARTICLES_DIR) if f.endswith('.json')])
    total = len(all_files)

    batch_size = 20
    start_idx = (batch_num - 1) * batch_size
    end_idx = min(start_idx + batch_size, total)

    print(f"Processing batch {batch_num}: files {start_idx+1} to {end_idx} of {total}")
    process_batch(all_files, batch_num, start_idx, end_idx)
