import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { Badge, BadgeText } from '@/components/ui/badge';
import LegalDisclaimer from '@/components/guides/LegalDisclaimer';
import { db } from '@/lib/supabase';

// Temporary static content overrides for Annulment (ID: 1)
const ANNULMENT_CONTENT_EN = `Annulment in the Philippines is a legal process that declares a marriage void from the beginning, as if it never existed. Unlike divorce, which ends a valid marriage, annulment is based on specific grounds showing that the marriage was flawed from the start. Because the Philippines does not have divorce for most citizens, annulment is one of the primary legal remedies for couples who wish to formally dissolve their marital ties and regain the right to remarry.

The Family Code of the Philippines outlines the grounds for annulment, which typically involve conditions present at the time of marriage. These include lack of parental consent for those aged eighteen to twenty-one, cases of mental incapacity or psychological incapacity, fraud or deceit that directly affects consent, or situations involving force, intimidation, or undue influence. Other grounds include one spouse being physically incapable of consummating the marriage or being afflicted with a serious sexually transmissible disease unknown to the other spouse at the time of marriage.

The annulment process generally begins with the filing of a petition in the Regional Trial Court, which has jurisdiction over family cases. The petitioner must present evidence to prove the ground cited, often requiring testimony from psychologists, doctors, or witnesses, depending on the case. The court also appoints a public prosecutor to ensure there is no collusion between the spouses, as annulment is not simply granted by mutual agreement. Hearings are conducted to evaluate the validity of the claims, and the judge ultimately issues a decision granting or denying the annulment.

Once an annulment is granted, the marriage is considered null and void, and both parties are legally restored to their single status. However, the decision must also be registered with the local civil registrar and the Philippine Statistics Authority for it to take full legal effect. Issues such as child custody, support, and property relations are also settled during or after the annulment proceedings to protect the rights of any children and to divide conjugal assets according to the law.

Because annulment in the Philippines can be costly and time-consuming, many individuals view it as a complex legal process requiring professional guidance. Nevertheless, it serves an important role for those whose marriages were fundamentally flawed from the beginning, providing a legal means to start anew while protecting the sanctity of family and marriage as recognized by Philippine law.`;

const ANNULMENT_CONTENT_FIL = `Ang annulment sa Pilipinas ay isang legal na proseso na nagdedeklara na walang bisa ang kasal mula pa sa simula, na para bang hindi ito kailanman naganap. Hindi tulad ng diborsyo na nagwawakas ng isang balidong kasal, ang annulment ay nakabatay sa mga tiyak na batayan na nagpapakita na may depekto na ang kasal noong ito ay isinagawa. Dahil walang diborsyo para sa karamihan ng mga Pilipino, ang annulment ang pangunahing paraan upang opisyal na mapawalang-bisa ang kasal at muling makapagpakasal nang ayon sa batas.

Itinatakda ng Family Code of the Philippines ang mga batayan para sa annulment, na karaniwang nakatuon sa mga kundisyong umiiral na noong ikinasal ang mag-asawa. Kabilang dito ang kawalan ng pahintulot ng magulang para sa mga ikinasal na edad labing-walo hanggang dalawampu’t isa, pagkakaroon ng mental o psychological incapacity, panlilinlang o pandaraya na direktang nakaapekto sa pahintulot, at paggamit ng puwersa o pananakot upang ituloy ang kasal. Kasama rin sa mga batayan ang pisikal na kawalan ng kakayahan upang makapagtalik o pagkakaroon ng malubhang sexually transmissible disease na hindi nalaman ng kabilang panig bago ikasal.

Nagsisimula ang proseso ng annulment sa paghahain ng petisyon sa Regional Trial Court na may hurisdiksyon sa mga kasong pampamilya. Kailangang magpakita ang naghain ng ebidensya upang patunayan ang batayan ng kaso, na kadalasang nangangailangan ng testimonya ng mga psychologist, doktor, o iba pang saksi depende sa sitwasyon. Nagtatalaga rin ang korte ng pampublikong piskal upang matiyak na walang sabwatan sa pagitan ng mag-asawa, dahil hindi ibinibigay ang annulment nang dahil lamang sa mutual na kasunduan. Isinasagawa ang mga pagdinig upang suriin ang katotohanan ng mga alegasyon, at ang hukom ang nagdedesisyon kung ipagkakaloob o tatanggihan ang annulment.

Kapag ipinagkaloob ang annulment, ang kasal ay itinuturing na walang bisa at parehong naibabalik ang estado ng dalawang panig bilang walang asawa. Kailangang mairehistro ang desisyon sa lokal na civil registrar at sa Philippine Statistics Authority upang magkaroon ito ng ganap na bisa. Nililinaw din sa proseso ang usapin ng kustodiya, suporta sa anak, at paghahati ng mga ari-arian upang mapangalagaan ang karapatan ng mga anak at maayos na maipamahagi ang mga pag-aari ayon sa batas.

Dahil ang annulment sa Pilipinas ay maaaring magastos at matagal, itinuturing ito ng marami bilang isang komplikadong proseso na nangangailangan ng gabay mula sa mga eksperto. Gayunpaman, mahalaga ang papel nito para sa mga kasal na may depekto mula pa sa simula, sapagkat nagbibigay ito ng legal na paraan upang makapagsimula muli habang pinapangalagaan ang dignidad ng pamilya at kasal sa ilalim ng batas ng Pilipinas.`;

// Probationary employment content (ID: 2)
const PROBATION_CONTENT_FIL = `Ang mga empleyado sa ilalim ng probationary period sa Pilipinas ay may mga karapatan na protektado ng batas, kahit hindi pa sila regular na empleyado. Ayon sa Labor Code ng Pilipinas, ang probationary period ay karaniwang tumatagal ng anim na buwan mula sa unang araw ng trabaho. Sa panahong ito, sinusuri ng employer ang kakayahan ng empleyado upang matukoy kung siya ay angkop para sa posisyon at maaaring ma-regular. Gayunpaman, hindi ibig sabihin nito na maaaring tratuhin ang probationary employee nang basta-basta o walang karapatan.
Isa sa mga pangunahing karapatan ng probationary employee ay ang makatanggap ng tamang sahod at benepisyo na naaayon sa minimum wage at mga batas sa paggawa. May karapatan din silang tumanggap ng mga benepisyo gaya ng Social Security System (SSS), PhilHealth, at Pag-IBIG contributions mula sa employer. Dapat ding malinaw na ipaalam ng employer ang pamantayan ng trabaho o performance standards sa simula pa lamang ng employment upang malaman ng empleyado kung ano ang inaasahan sa kanya.
Mahalaga ring tandaan na hindi maaaring tanggalin ang probationary employee nang walang sapat na dahilan. Ayon sa batas, maaaring tapusin ang kontrata ng probationary employee kung hindi niya natugunan ang itinakdang pamantayan ng kumpanya, o kung may ibang balidong dahilan gaya ng paglabag sa polisiya ng kompanya. Gayunpaman, kailangang magbigay ang employer ng malinaw na abiso at dahilan bago tapusin ang kontrata upang masiguro na patas ang proseso.
Kung sakaling matapos ang anim na buwang probationary period nang hindi inaalis o binibigyan ng abiso ang empleyado, awtomatiko siyang nagiging regular na empleyado. Ibig sabihin, makakamtan niya ang buong karapatan at seguridad sa trabaho na tinatamasa ng regular workers, kabilang ang proteksyon laban sa hindi makatarungang pagtanggal.
Sa kabuuan, ang probationary period ay panahon ng pagsusuri para sa parehong empleyado at employer. Gayunpaman, nananatiling mahalaga ang pagsunod sa batas upang mapangalagaan ang karapatan ng empleyado at matiyak ang makatarungang ugnayan sa trabaho.`;

const PROBATION_CONTENT_EN = `Employees under a probationary period in the Philippines are protected by law and retain specific rights even if they have not yet achieved regular employment status. According to the Philippine Labor Code, the probationary period usually lasts six months from the first day of work. During this time, the employer evaluates the employee’s performance to determine if they are fit for regularization. However, probationary status does not mean that the employee can be treated unfairly or stripped of basic rights.
One of the fundamental rights of probationary employees is to receive proper wages and benefits in accordance with the minimum wage laws and labor regulations. They are also entitled to mandatory benefits such as Social Security System (SSS), PhilHealth, and Pag-IBIG contributions provided by the employer. In addition, employers are required to clearly communicate the performance standards or criteria for regularization at the very start of employment so employees know exactly what is expected of them.
It is also important to note that probationary employees cannot be dismissed without just cause. Under the law, their employment may be terminated if they fail to meet the reasonable standards set by the company or if there are other valid reasons such as violation of company policies. However, employers must provide clear notice and justification before ending the employment to ensure due process and fairness.
If the six-month probationary period lapses without termination or prior notice, the employee automatically becomes regular. This means they will enjoy full security of tenure and all the rights accorded to regular employees, including protection against unjust dismissal.
In essence, the probationary period is a time for both employee and employer to assess if the working relationship is a good fit. Still, compliance with labor laws is essential to safeguard employee rights and maintain fairness in the workplace.`;

// Database article shape (subset)
interface DbArticleRow {
  id: number;
  title_en: string;
  title_fil: string | null;
  content_en: string;
  content_fil: string | null;
  domain: string | null;
  category?: string | null;
  image_article?: string | null;
  is_verified: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

function getCategoryBadgeClasses(category?: string): { container: string; text: string } {
  switch ((category || '').toLowerCase()) {
    case 'family':
      return { container: 'bg-rose-50 border-rose-200', text: 'text-rose-700' };
    case 'work':
      return { container: 'bg-blue-50 border-blue-200', text: 'text-blue-700' };
    case 'civil':
      return { container: 'bg-violet-50 border-violet-200', text: 'text-violet-700' };
    case 'criminal':
      return { container: 'bg-red-50 border-red-200', text: 'text-red-700' };
    case 'consumer':
      return { container: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' };
    default:
      return { container: 'bg-gray-50 border-gray-200', text: 'text-gray-700' };
  }
}

// No structured sections yet from DB; use raw content fields

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export default function ArticleViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<DbArticleRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilipino, setShowFilipino] = useState(false);
  const noImageUri = 'https://placehold.co/1200x800/png?text=No+Image+Available';

  useEffect(() => {
    if (id) {
      fetchArticle();
    }
  }, [id]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const numericId = parseInt(id);
      if (Number.isNaN(numericId)) {
        setArticle(null);
        return;
      }
      const { data, error } = await db.legal.articles.get(numericId);
      if (error) {
        console.error('Error fetching article:', error);
        setArticle(null);
        return;
      }
      setArticle(data as unknown as DbArticleRow);
    } catch (error) {
      console.error('Error fetching article:', error);
      setArticle(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const toggleLanguage = () => {
    setShowFilipino(!showFilipino);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading article...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!article) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Article not found</Text>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary.blue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Article</Text>
        <TouchableOpacity onPress={toggleLanguage} style={styles.languageBtn}>
          <Text style={styles.languageBtnText}>
            {showFilipino ? 'EN' : 'FIL'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Article Image */}
        <Image 
          source={{ uri: ((article as any).image_article || (article as any).article_image || noImageUri) as string }}
          style={styles.articleImage}
          resizeMode="cover"
        />


        <View style={styles.articleContent}>

             {/* Language Toggle Info */}
             <View style={styles.languageToggleInfo}>
            <Ionicons name="language-outline" size={16} color={Colors.text.sub} />
            <Text style={styles.languageToggleText}>
              Tap the language button above to switch between English and Filipino
            </Text>
          </View>
        

          {/* Title */}
          <Text style={styles.title}>
            {showFilipino && article.title_fil ? article.title_fil : article.title_en}
          </Text>

          {/* Alternate Title */}
          {(showFilipino ? article.title_en : article.title_fil) && (
            <Text style={styles.alternateTitle}>
              {showFilipino ? article.title_en : article.title_fil}
            </Text>
          )}

            {/* Category Badge */}


            {((article as any).category || article.domain) && (
            <View style={styles.categoryContainer}>
              <Badge
                variant="outline"
                className={`rounded-md ${getCategoryBadgeClasses(((article as any).category || article.domain || '') as string).container}`}
              >
                <BadgeText size="sm" className={getCategoryBadgeClasses(((article as any).category || article.domain || '') as string).text}>
                  {(article as any).category || article.domain}
                </BadgeText>
              </Badge>
            </View>
          )}

          {/* Summary */}
          <Text style={styles.summary}>
            {showFilipino && article.content_fil ? article.content_fil : article.content_en}
          </Text>
          

          {/* Metadata */}
          <View style={styles.metadataContainer}>
            <View style={styles.metadataRow}>
              <Ionicons name="calendar-outline" size={16} color={Colors.text.sub} />
              <Text style={styles.metadataText}>
                Posted on {formatDate(article.created_at)}
              </Text>
            </View>
            
            {article.updated_at && article.updated_at !== article.created_at && (
              <View style={styles.metadataRow}>
                <Ionicons name="refresh-outline" size={16} color={Colors.text.sub} />
                <Text style={styles.metadataText}>
                  Updated on {formatDate(article.updated_at)}
                </Text>
              </View>
            )}

            

            {article.is_verified === true && (
              <View style={styles.metadataRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.metadataText, { color: '#10B981' }]}>
                  Verified Content
                </Text>
              </View>
            )}
          </View>

          {/* Article Content */}
          <View style={styles.contentSection}>
            <Text style={styles.contentText}>
              {showFilipino && article.content_fil ? article.content_fil : article.content_en}
            </Text>
          </View>

          {/* Legal Disclaimer - Always appears */}
          <LegalDisclaimer showFilipino={showFilipino} />

       
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.blue,
  },
  languageBtn: {
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  languageBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.sub,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: Colors.text.head,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  articleImage: {
    width: '100%',
    height: 240,
  },
  articleContent: {
    padding: 20,
  },
  categoryContainer: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.head,
    lineHeight: 36,
    marginBottom: 8,
  },
  alternateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.blue,
    lineHeight: 28,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text.sub,
    marginTop: -15,
    marginBottom: 5,
    fontStyle: 'italic',
    backgroundColor: '#F8FAFC',
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderRadius: 8,
  },
  metadataContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 14,
    color: Colors.text.sub,
    marginLeft: 8,
    flex: 1,
  },
  contentSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contentText: {
    fontSize: 16,
    lineHeight: 26,
    color: Colors.text.head,
    textAlign: 'justify',
  },
  languageToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  languageToggleText: {
    fontSize: 12,
    color: Colors.text.sub,
    marginLeft: 8,
    flex: 1,
  },
});
