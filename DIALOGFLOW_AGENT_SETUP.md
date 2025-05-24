# Dialogflow ES Agent Setup for Hellas Direct

## Step 1: Create Dialogflow ES Agent

1. **Go to Dialogflow Console**
   - Visit: https://dialogflow.cloud.google.com/
   - Sign in with your Google account

2. **Create New Agent**
   - Click "Create Agent"
   - **Agent name**: `hellas-direct-assistant`
   - **Default language**: Greek (el)
   - **Default time zone**: Europe/Athens
   - **Google Cloud Project**: Select `hellas-direct-chat`
   - Click "CREATE"

## Step 2: Create Core Intents

### 2.1 Welcome Intent (Default Welcome Intent)
**Training Phrases:**
- Γεια σας
- Καλησπέρα
- Χαίρετε
- Βοήθεια
- Ξεκινάμε

**Response:**
```
👋 Καλώς ήρθατε στη Hellas Direct! 

Εξυπηρετώ για:
🚗 **Ατυχήματα (AC)** - Τροχαία ατυχήματα
🔧 **Οδική Βοήθεια (RA)** - Βλάβες, πανάρια, μπαταρία

Περιγράψτε το περιστατικό σας για να ξεκινήσουμε.
```

### 2.2 Accident Intent
**Intent Name**: `accident.report`
**Training Phrases:**
- Είχα τρακάρισμα
- Έγινε ατύχημα
- Χτύπησα άλλο αυτοκίνητο
- Με χτύπησαν
- Έσπασε το παρμπρίζ
- Ζημιά στο αυτοκίνητο
- Ατύχημα σε σταθμευμένο όχημα
- Εξωτερικός παράγοντας προκάλεσε ζημιά

**Parameters:**
- `@location` → sys.location
- `@vehicle-damage` → @sys.any
- `@incident-description` → @sys.any

**Response:**
```
Λυπάμαι που ακούω για το ατύχημα. Θα σας βοηθήσω να καταγράψουμε όλες τις απαραίτητες πληροφορίες.

Πρώτα από όλα, **πού ακριβώς βρίσκεστε τώρα;** 
(Διεύθυνση, περιοχή, ή landmarks)
```

### 2.3 Roadside Assistance Intent
**Intent Name**: `roadside.assistance`
**Training Phrases:**
- Έσπασε το λάστιχο
- Τέλειωσε η βενζίνη
- Η μπαταρία είναι άδεια
- Το αυτοκίνητο δεν ξεκινάει
- Έπαθε βλάβη
- Σταμάτησε το αυτοκίνητο
- Χρειάζομαι οδική βοήθεια
- Μένω στη μέση του δρόμου

**Parameters:**
- `@location` → sys.location
- `@problem-type` → @sys.any
- `@vehicle-condition` → @sys.any

**Response:**
```
Καταλαβαίνω ότι έχετε πρόβλημα με το όχημά σας. Θα σας βοηθήσω να οργανώσουμε την οδική βοήθεια.

**Πού ακριβώς βρίσκεστε;** 
(Διεύθυνση, km εθνικής οδού, ή περιγραφή τοποθεσίας)
```

### 2.4 Location Collection Intent
**Intent Name**: `collect.location`
**Training Phrases:**
- Βρίσκομαι στην [location]
- Είμαι στο [location]
- Είμαι στον [location]
- Η τοποθεσία μου είναι [location]
- [location]

**Parameters:**
- `@location` → sys.location (required)

**Response:**
```
Ευχαριστώ για την τοποθεσία: {{location}}

Τώρα **μπορείτε να μου δώσετε το ονοματεπώνυμό σας;**
```

### 2.5 Personal Information Intent
**Intent Name**: `collect.personal.info`
**Training Phrases:**
- Το όνομά μου είναι [person-name]
- Λέγομαι [person-name]
- Με λένε [person-name]
- Είμαι ο/η [person-name]
- [person-name]

**Parameters:**
- `@person-name` → sys.person (required)

**Response for AC:**
```
Ευχαριστώ κ. {{person-name}}.

**Ποιος είναι ο αριθμός κυκλοφορίας του οχήματός σας;**
```

**Response for RA:**
```
Ευχαριστώ κ. {{person-name}}.

**Ποιος είναι ο αριθμός κυκλοφορίας του οχήματός σας;**
```

### 2.6 Vehicle Registration Intent
**Intent Name**: `collect.vehicle.registration`
**Training Phrases:**
- Ο αριθμός κυκλοφορίας είναι [registration]
- Πινακίδα [registration]
- [registration]
- Κυκλοφορίας [registration]

**Parameters:**
- `@registration` → @sys.any (required)

**Response:**
```
Καταγράφηκε: {{registration}}

**Μπορείτε να περιγράψετε πώς ακριβώς συνέβη το περιστατικό;**
```

### 2.7 Incident Description Intent
**Intent Name**: `collect.incident.description`
**Training Phrases:**
- Έγινε [description]
- Συνέβη [description]
- Το περιστατικό [description]
- [description]

**Parameters:**
- `@description` → @sys.any (required)

**Response for AC:**
```
Καταλαβαίνω: {{description}}

**Σε περίπτωση που το όχημα δεν μπορεί να μετακινηθεί, ποιος θα θέλατε να είναι ο τελικός του προορισμός;**
(Συνεργείο, οικία, συγκεκριμένη διεύθυνση)
```

**Response for RA:**
```
Καταλαβαίνω: {{description}}

**Υπάρχει ρεζέρβα στο όχημα;**
```

### 2.8 Destination Intent
**Intent Name**: `collect.destination`
**Training Phrases:**
- Στο συνεργείο
- Στο σπίτι μου
- Στην οικία μου
- Στη διεύθυνση [address]
- [address]

**Parameters:**
- `@destination` → @sys.any (required)

**Response:**
```
Τελικός προορισμός: {{destination}}

**Είστε όλοι εντάξει; Υπάρχει κάποιος τραυματισμός;**
```

### 2.9 Injury Check Intent
**Intent Name**: `collect.injury.status`
**Training Phrases:**
- Όλοι εντάξει
- Δεν υπάρχει τραυματισμός
- Κανένας τραυματισμός
- Υπάρχει τραυματισμός
- Κάποιος χτυπήθηκε
- Ναι είμαστε καλά
- Όχι δεν έπαθε κανείς τίποτα

**Response:**
```
Καταγράφηκε η κατάσταση τραυματισμών.

**Τι υλικές ζημιές έχετε στο όχημά σας; Πού βρίσκονται;**
```

### 2.10 Damage Description Intent
**Intent Name**: `collect.damage.description`
**Training Phrases:**
- Ζημιά στο [car-part]
- Σπασμένο [car-part]
- Χτυπημένο [car-part]
- [damage-description]

**Parameters:**
- `@damage-description` → @sys.any (required)

**Response:**
```
Καταγράφηκαν οι ζημιές: {{damage-description}}

**Ποια είναι η ασφαλιστική εταιρία του εμπλεκόμενου οχήματος;**
```

### 2.11 Insurance Company Intent
**Intent Name**: `collect.insurance.company`
**Training Phrases:**
- [insurance-company]
- Η ασφαλιστική είναι [insurance-company]
- [insurance-company] ασφαλιστική

**Parameters:**
- `@insurance-company` → @sys.any (required)

**Response:**
```
Ασφαλιστική εταιρία: {{insurance-company}}

**Μπορείτε να στείλετε φωτογραφίες της άδειας κυκλοφορίας, του διπλώματός σας, των ζημιών και του σημείου του συμβάντος;**

Απαντήστε "ναι" όταν είστε έτοιμοι.
```

### 2.12 Photos Confirmation Intent
**Intent Name**: `collect.photos.confirmation`
**Training Phrases:**
- Ναι
- Έτοιμος
- Οκ
- Εντάξει
- Στείλω φωτογραφίες

**Response:**
```
Τέλεια! Σας ευχαριστούμε για τη συνεργασία.

**📋 ΣΥΝΟΨΗ ΠΕΡΙΣΤΑΤΙΚΟΥ ΑΤΥΧΗΜΑΤΟΣ:**

🏷️ **Αριθμός Κυκλοφορίας:** {{registration}}
👤 **Όνομα:** {{person-name}} 
📍 **Τοποθεσία:** {{location}}
📝 **Περιγραφή:** {{description}}
🏁 **Τελικός Προορισμός:** {{destination}}
🏥 **Τραυματισμοί:** {{injury-status}}
🔧 **Ζημιές:** {{damage-description}}
🏢 **Ασφαλιστική Αντιπάλου:** {{insurance-company}}

Η αίτησή σας έχει καταγραφεί και θα επικοινωνήσουμε μαζί σας σύντομα.
```

## Step 3: Additional Setup

### 3.1 Enable Small Talk
- Go to "Small Talk" in the left sidebar
- Enable small talk for better conversational experience

### 3.2 Set Default Fallback
- Update Default Fallback Intent response:
```
Συγγνώμη, δε μπόρεσα να καταλάβω. 

Μπορείτε να:
- Περιγράψετε το περιστατικό σας πιο απλά
- Πείτε "ατύχημα" για τροχαίο
- Πείτε "βλάβη" για οδική βοήθεια
- Πείτε "βοήθεια" για να ξεκινήσουμε από την αρχή
```

### 3.3 Test the Agent
1. Use the Simulator in Dialogflow Console
2. Test various conversation flows
3. Verify all intents trigger correctly

## Step 4: Connect to Your Application

Once the agent is created and tested:

1. **Verify Project ID**: Ensure your `.env.local` has the correct project ID
2. **Test Integration**: Your existing code should now work
3. **Monitor Logs**: Check both Dialogflow and your application logs

## Step 5: Advanced Features (Optional)

### Context Management
- Use contexts to maintain conversation flow
- Track which information has been collected

### Entities
- Create custom entities for common insurance terms
- Car parts, insurance companies, etc.

### Fulfillment Webhook
- Eventually replace static responses with dynamic webhook responses
- Connect to your actual case management system

## Troubleshooting

If you get "agent not found" errors:
1. Verify the project ID matches exactly
2. Ensure the agent is created in the correct project
3. Check service account permissions

The key is creating the agent first in the Dialogflow Console, then your existing code will work perfectly!
