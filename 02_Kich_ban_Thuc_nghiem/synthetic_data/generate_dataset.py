"""
Sinh file benchmark_dataset.py chứa 1000 cặp (input_texts, reference_texts).
Chạy: python generate_dataset.py
"""
import random, textwrap, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from data_synthesizer import inject_errors

# === 200 đoạn văn gốc chuẩn (văn phong tiểu học, 2-3 câu) ===
SEED_CORPUS = [
    "Sáng nay trời trong xanh, em vui vẻ đi học. Trên đường đi, em thấy những bông hoa nở rất đẹp.",
    "Mùa xuân đến, cây cối đâm chồi nảy lộc. Chim chóc hót líu lo trên cành cây xanh tươi.",
    "Bà ngoại kể cho em nghe chuyện cổ tích. Em rất thích nghe bà kể về chú Cuội ngồi gốc cây đa.",
    "Hôm nay lớp em được đi tham quan vườn thú. Em thấy con voi rất to và con khỉ rất nghịch ngợm.",
    "Mẹ em nấu cơm rất ngon. Món canh chua cá lóc là món em thích nhất trong bữa cơm gia đình.",
    "Trường em có sân rất rộng. Giờ ra chơi, các bạn chạy nhảy vui vẻ trên sân trường.",
    "Chiều nay em giúp mẹ quét nhà và rửa bát. Mẹ khen em ngoan và thưởng cho em một cây kem.",
    "Bố em là bộ đội, bố đóng quân ở biên giới. Em rất nhớ bố và mong bố sớm được về thăm nhà.",
    "Con mèo nhà em rất đáng yêu. Nó có bộ lông vàng mượt và đôi mắt xanh biếc rất đẹp.",
    "Ngày Tết, cả nhà em đi chúc Tết ông bà. Ông bà lì xì cho em và dặn em phải chăm ngoan học giỏi.",
    "Em có một người bạn thân tên là Hùng. Hai đứa em thường rủ nhau đi đá bóng vào buổi chiều.",
    "Mùa hè, em được về quê ngoại chơi. Quê ngoại có cánh đồng lúa xanh mướt và dòng sông trong veo.",
    "Cô giáo em rất hiền và dạy rất hay. Em rất yêu cô và luôn cố gắng học tập thật tốt.",
    "Buổi sáng, mặt trời lên cao và chiếu sáng khắp nơi. Em mở cửa sổ đón ánh nắng ấm áp vào phòng.",
    "Trời mưa rất to, nước chảy đầy đường. Em mặc áo mưa và đi ủng để đến trường cho kịp giờ.",
    "Em có một con chó tên là Lu. Lu rất trung thành và hay vẫy đuôi mừng khi em đi học về.",
    "Nguyễn Văn Hùng là lớp trưởng của lớp em. Bạn ấy học rất giỏi và hay giúp đỡ các bạn trong lớp.",
    "Hà Nội là thủ đô của nước Việt Nam. Em rất muốn được đến Hà Nội để thăm Hồ Gươm và Lăng Bác.",
    "Bác Hồ là vị lãnh tụ vĩ đại của dân tộc Việt Nam. Bác rất yêu thương thiếu nhi và nhân dân.",
    "Mùa thu, lá vàng rơi đầy sân trường. Em nhặt những chiếc lá vàng ép vào vở làm kỷ niệm.",
    "Em thích đọc sách vì sách cho em nhiều kiến thức mới. Cuốn sách em thích nhất là Dế Mèn phiêu lưu ký.",
    "Hôm qua em bị ốm phải nghỉ học ở nhà. Mẹ nấu cháo cho em ăn và cho em uống thuốc.",
    "Vào mùa đông, trời rất lạnh và hay có sương mù. Em mặc áo ấm và quàng khăn len khi đi học.",
    "Sông Hồng chảy qua Hà Nội rất đẹp. Hai bên bờ sông có nhiều cây xanh và nhà cửa san sát.",
    "Em rất thích môn toán vì giải bài tập rất thú vị. Hôm nay cô cho bài kiểm tra và em được điểm mười.",
    "Chiều nay em đi chợ với mẹ mua rau và thịt. Mẹ dạy em cách chọn rau tươi và thịt ngon.",
    "Ngày khai giảng, em mặc áo trắng quần xanh rất đẹp. Em hứa sẽ cố gắng học thật giỏi trong năm học mới.",
    "Ông nội em trồng rất nhiều cây ăn quả trong vườn. Mùa hè, em được ăn xoài, mít và chôm chôm rất ngon.",
    "Em có một chiếc cặp sách màu xanh rất đẹp. Bố mua cho em nhân dịp sinh nhật lần thứ tám.",
    "Buổi tối, cả nhà em quây quần bên nhau xem ti vi. Bố mẹ và em cùng xem phim hoạt hình rất vui.",
    "Lớp em có bốn mươi bạn, ai cũng ngoan và chăm học. Bạn Lan là người học giỏi nhất lớp em.",
    "Em rất thích vẽ tranh. Em hay vẽ cảnh đồng quê với cánh đồng lúa, con trâu và đàn cò trắng.",
    "Mẹ em là giáo viên dạy ở trường tiểu học. Mẹ rất yêu học sinh và luôn tận tình giảng dạy.",
    "Hôm nay là sinh nhật em, bố mẹ mua cho em một chiếc bánh kem rất to. Em mời các bạn đến dự tiệc sinh nhật.",
    "Con sông quê em rất trong và mát. Chiều chiều, em cùng các bạn ra sông tắm và bắt cá rất vui.",
    "Em yêu đất nước Việt Nam xinh đẹp. Đất nước em có biển xanh, núi cao và đồng bằng rộng lớn.",
    "Chị gái em năm nay học lớp chín. Chị rất chăm chỉ học bài và luôn đạt học sinh giỏi.",
    "Trần Quốc Toản là một thiếu niên anh hùng. Em rất ngưỡng mộ lòng yêu nước của anh ấy.",
    "Mùa hè nắng nóng, em hay đi bơi ở hồ bơi. Bơi lội giúp em khỏe mạnh và cao lớn hơn.",
    "Bài thơ Lượm của nhà thơ Tố Hữu rất hay. Em thuộc lòng bài thơ và đọc cho cả lớp nghe.",
    "Em nuôi một đàn gà trong vườn nhà. Mỗi sáng em cho gà ăn thóc và nhặt trứng gà rất vui.",
    "Thành phố Hồ Chí Minh rất đông đúc và sầm uất. Em muốn đến đó để thăm Dinh Độc Lập.",
    "Cây bàng trước sân trường em rất to. Mùa hè cây xanh mướt, mùa đông lá đỏ rất đẹp.",
    "Em tập viết chữ đẹp mỗi ngày. Cô giáo khen chữ em viết ngày càng đẹp và đều hơn.",
    "Ngày Nhà giáo Việt Nam hai mươi tháng mười một, em tặng cô một bó hoa tươi thắm.",
    "Biển Nha Trang rất đẹp với bãi cát trắng mịn. Em được bố mẹ cho đi biển vào mùa hè năm ngoái.",
    "Em có một chiếc xe đạp nhỏ màu đỏ. Em hay đạp xe quanh xóm vào buổi chiều mát mẻ.",
    "Cánh đồng quê em lúa chín vàng óng ả. Bà con nông dân vui vẻ gặt lúa và hát vang trên đồng.",
    "Mẹ dạy em nấu cơm và rán trứng. Em rất vui vì đã biết giúp mẹ việc nhà từ khi còn nhỏ.",
    "Ngôi nhà em ở rất ấm cúng và sạch sẽ. Trước nhà có một vườn hoa với nhiều loài hoa rực rỡ.",
    "Em học bài rất chăm chỉ để không phụ lòng bố mẹ. Em mong muốn sau này lớn lên sẽ trở thành bác sĩ.",
    "Dòng sông Cửu Long chảy qua miền Tây rất rộng. Trên sông có nhiều thuyền bè qua lại tấp nập.",
    "Cô Nguyễn Thị Hoa là cô giáo chủ nhiệm lớp em. Cô rất nghiêm khắc nhưng cũng rất thương học sinh.",
    "Trời thu mát mẻ, em đi dạo trong công viên. Gió thổi nhẹ nhàng và lá vàng bay trong gió.",
    "Em rất thích chơi cầu lông với bố vào buổi chiều. Bố dạy em cách đánh cầu và cách di chuyển nhanh.",
    "Bà em hay kể chuyện ngày xưa cho em nghe. Bà nói ngày xưa bà phải đi bộ rất xa để đến trường.",
    "Hồ Gươm ở giữa thủ đô Hà Nội rất đẹp. Xung quanh hồ có nhiều cây xanh và đền Ngọc Sơn cổ kính.",
    "Em có một quyển nhật ký viết bằng bút mực xanh. Em ghi lại những chuyện vui buồn mỗi ngày.",
    "Vịnh Hạ Long là di sản thiên nhiên thế giới. Có hàng nghìn hòn đảo đá vôi rất đẹp và kỳ vĩ.",
    "Bạn Mai ngồi cạnh em trong lớp. Bạn ấy rất hay giúp đỡ em khi em không hiểu bài.",
    "Mùa xuân, hoa đào nở hồng rực rỡ ở miền Bắc. Em rất thích ngắm hoa đào vì chúng rất đẹp.",
    "Trưa nay em ăn cơm ở trường. Bữa cơm có thịt kho, canh rau và đậu phụ rất ngon.",
    "Em viết thư gửi bố đang công tác ở xa. Em kể cho bố nghe chuyện học hành và cuộc sống ở nhà.",
    "Chú bộ đội đứng gác ở biên giới rất dũng cảm. Em rất kính trọng và biết ơn các chú bộ đội.",
    "Sáng chủ nhật, em dậy sớm tập thể dục. Em chạy bộ quanh công viên và hít thở không khí trong lành.",
    "Núi Bà Đen ở tỉnh Tây Ninh rất cao và đẹp. Em được bố mẹ đưa đi leo núi vào dịp nghỉ lễ.",
    "Em rất yêu quý gia đình mình. Bố mẹ luôn yêu thương và chăm sóc em từng ngày.",
    "Cây phượng vĩ trước trường em nở hoa đỏ rực. Mùa hè đến là mùa hoa phượng nở rất đẹp.",
    "Đêm trung thu, em được rước đèn ông sao. Em vừa đi vừa hát bài trăng ơi từ đâu đến rất vui.",
    "Bé Na là em gái của em, bé mới ba tuổi. Bé rất hay cười và thích chơi với búp bê.",
    "Em thích ăn phở bò vào buổi sáng. Bát phở nóng hổi với hành lá và giá đỗ rất ngon.",
    "Ao cá nhà em có nhiều cá chép và cá rô. Chiều nào em cũng cho cá ăn và ngồi ngắm cá bơi.",
    "Ngày quốc khánh mùng hai tháng chín rất vui. Đường phố treo cờ đỏ sao vàng và bắn pháo hoa.",
    "Cô giáo dạy em bài hát về mẹ rất hay. Em hát tặng mẹ và mẹ cảm động rơi nước mắt.",
    "Mỗi buổi sáng, em đánh răng và rửa mặt thật sạch. Giữ vệ sinh giúp em có nụ cười tươi sáng.",
    "Đồng bằng sông Cửu Long có nhiều vườn trái cây. Em thích ăn trái măng cụt và sầu riêng.",
    "Tết Nguyên Đán là ngày lễ lớn nhất của người Việt Nam. Mọi người sum họp bên gia đình và chúc nhau.",
    "Em hay giúp bà tưới cây trong vườn mỗi chiều. Bà trồng rau muống, rau cải và cà chua rất xanh tốt.",
    "Anh trai em đang học đại học ở Sài Gòn. Anh hay gọi điện về nhà hỏi thăm sức khỏe mọi người.",
    "Bài tập toán hôm nay rất khó nhưng em vẫn cố gắng làm. Em hỏi bố giúp và cuối cùng em đã làm được.",
    "Rừng Cúc Phương có rất nhiều loài động vật quý hiếm. Em muốn đến đó để ngắm voọc và các loài chim.",
    "Em rất thích nghe nhạc thiếu nhi. Bài hát em thích nhất là bài Trường em xinh sao rất hay.",
    "Trường em tổ chức hội thao vào cuối tuần. Em tham gia chạy tiếp sức và được giải nhất rất vui.",
    "Cầu Rồng ở thành phố Đà Nẵng rất đẹp. Buổi tối, cầu sáng lên nhiều màu sắc rực rỡ.",
    "Em đi học về, thấy mẹ đang nấu ăn trong bếp. Mùi thức ăn thơm phức bay khắp nhà rất hấp dẫn.",
    "Bố em hay đọc báo vào mỗi buổi sáng sớm. Bố nói đọc báo giúp mình hiểu biết thêm nhiều điều hay.",
    "Mưa phùn bay nhẹ ngoài cửa sổ. Em ngồi trong nhà đọc sách và nghe tiếng mưa rơi rất êm tai.",
    "Đội tuyển bóng đá Việt Nam thi đấu rất hay. Em và bố cùng cổ vũ cho đội tuyển trước ti vi.",
    "Em cùng bạn Tuấn đi thả diều trên cánh đồng. Chiếc diều bay cao vút trên bầu trời xanh biếc.",
    "Chợ quê em họp vào mỗi sáng sớm. Chợ bán rất nhiều rau quả tươi ngon và cá tôm từ sông.",
    "Em rất thích học môn tập đọc. Những bài đọc kể về cuộc sống và thiên nhiên rất hay.",
    "Ngày hai mươi ba tháng mười hai là ngày sinh nhật Bác Hồ ở nước ngoài. Bác đã xa quê hương nhiều năm.",
    "Nhà em nuôi một đôi chim bồ câu trắng. Mỗi sáng, đôi chim gù nhẹ nhàng nghe rất hay.",
    "Em mong ước thế giới luôn hòa bình. Trẻ em khắp nơi đều được đi học và vui chơi hạnh phúc.",
    "Công viên gần nhà em có rất nhiều cây xanh. Buổi chiều, mọi người đến đây tập thể dục và đi dạo.",
    "Bạn Minh bị ngã xe đạp và bị xước đầu gối. Em đã dìu bạn vào trạm y tế của trường.",
    "Sáng sớm, sương mù phủ trắng cánh đồng. Mặt trời lên dần và sương tan đi để lộ đồng lúa xanh.",
    "Em ước mơ sau này lớn lên sẽ làm kỹ sư. Em sẽ xây dựng những ngôi nhà đẹp cho mọi người.",
    "Chú Tư hàng xóm có vườn cam rất to. Mùa cam chín, chú cho em mấy quả cam rất ngọt.",
    "Em và các bạn cùng nhau dọn vệ sinh lớp học. Lớp học sạch sẽ giúp mọi người học tập tốt hơn.",
]

def main():
    random.seed(42)
    # Nhân bản corpus lên ~1000 bằng cách lặp + xáo trộn
    corpus = SEED_CORPUS.copy()
    while len(corpus) < 1000:
        corpus.extend(SEED_CORPUS)
    random.shuffle(corpus)
    corpus = corpus[:1000]

    input_texts = []
    reference_texts = []
    for i, clean in enumerate(corpus):
        noisy, _ = inject_errors(clean, error_rate=0.15, min_errors=2, max_errors=5, seed=42+i)
        input_texts.append(noisy)
        reference_texts.append(clean)

    # Ghi ra file benchmark_dataset.py
    out = os.path.join(os.path.dirname(__file__), "benchmark_dataset.py")
    with open(out, "w", encoding="utf-8") as f:
        f.write('"""\nBộ dữ liệu benchmark 1000 mẫu — Sinh tự động bởi generate_dataset.py\n"""\n\n')
        f.write("input_texts = [\n")
        for t in input_texts:
            f.write(f"    {t!r},\n")
        f.write("]\n\n")
        f.write("reference_texts = [\n")
        for t in reference_texts:
            f.write(f"    {t!r},\n")
        f.write("]\n")

    print(f"[OK] Da sinh {len(input_texts)} mau -> {out}")
    # Hiển thị 5 mẫu đầu
    for i in range(5):
        print(f"\n[{i+1}] Input : {input_texts[i]}")
        print(f"     Ref   : {reference_texts[i]}")

if __name__ == "__main__":
    main()
